import { firebaseConfig } from './firebase-config';
import { initializeApp } from 'firebase/app';
import { getFirestore, addDoc, collection, serverTimestamp, deleteDoc, doc, onSnapshot, Timestamp, setDoc, DocumentSnapshot, updateDoc, getDoc, arrayUnion, query, where, getDocs, writeBatch, arrayRemove, or } from 'firebase/firestore';
import { inRoom, localDisplayStream, localStream, messages, remoteStreams, roomId, screenShareEnabled, sendEnabled, streamConstraints, username } from './stores';
import { get } from 'svelte/store';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const config = {
    iceServers: [
        {urls: 'stun:stun.l.google.com:19302'}
    ]
};

const dbRoot = 'uvu';

export let localUid = Math.random().toString(36).slice(-8);

/** @type {?import ('firebase/firestore').DocumentReference} */
let roomRef;

/** @type {?import ('firebase/firestore').CollectionReference} */
let connectionsRef;

/** @type {Object.<string, import ('firebase/firestore').DocumentReference>} */
const connectionDocRefs = {};

/** @type {Object.<string, RTCPeerConnection>} */
const peerConnections = {};

/** @type {Object.<string, RTCDataChannel>} */
const dataChannels = {};

/** @type {import('firebase/firestore').Unsubscribe} */
let unsub;

/** @type {Object.<string, import('firebase/firestore').Unsubscribe>} */
const candidateUnsubs = {};

/** @type {Object.<string, Date>} */
const offerTimes = {};

/** @type {Object.<string, Date>} */
const answerTimes = {};

/** @type {Object.<string, string>} */
const participantNames = {};

const localStreamQueue = [];
const localDisplayStreamQueue = [];
let remoteStreamQueue = [];
let remoteStreamInfos = [];

export async function createRoom() {
    try {
        const constraints = get(streamConstraints);

        // if(constraints.audio || constraints.video) await startStream();
        // if(get(screenShareEnabled)) await startDisplayStream();
        
        const roomData = {
            participants: [localUid],
            created: serverTimestamp()
        };

        roomRef = await addDoc(collection(db, dbRoot), roomData);
        connectionsRef = collection(db, roomRef.path, 'connections');

        addNegotiator();

        console.log(`Created room. ID: ${roomRef.id}`);

        roomId.set(roomRef.id);
        inRoom.set(true);
    } catch(error) {
        console.error('Unable to create room.', error);
        throw error;
    }
}

export async function joinRoom() {
    try {
        if(!get(roomId)) throw new Error('No room id to join.');
    
        roomRef = doc(db, dbRoot, get(roomId));
        connectionsRef = collection(db, roomRef.path, 'connections');
    
        const snapshot = await getDoc(roomRef);
    
        if(!snapshot.exists()) throw new Error('Room not found.');
    
        const constraints = get(streamConstraints);

        // if(constraints.audio || constraints.video) await startStream();
        // if(get(screenShareEnabled)) await startDisplayStream();
    
        // Retrieve the room data
        const roomData = snapshot.data();
        console.log('Room', snapshot.id, roomData);

        // Cancel joining if the room limit has already been reached
        if(roomData.participants.length >= 4) {
            console.warn('Room limit reached. Unable to join.');
            await exitRoom();
            return;
        }
    
        // Check for uid overlap (This should rarely need to be called if ever)
        while(roomData.participants.includes(localUid)) {
            localUid = Math.random().toString(36).slice(-8);
            console.warn(`Uid conflict. New uid created: ${localUid}`);
        }
    
        // Update the room document
        const updateData = {
            participants: arrayUnion(localUid)
        };
    
        await updateDoc(roomRef, updateData);
    
        // Create offers
        roomData.participants.forEach(participant => createOffer(participant));
    
        addNegotiator();
    
        inRoom.set(true);
    } catch(error) {
        console.error('Unable to join room.', error);
        throw error;
    }
}

export async function exitRoom() {
    try {
        if(!roomRef) throw new Error('Missing room ref.');

        if(get(localStream)) stopStream(localStream);
        if(get(localDisplayStream)) stopStream(localDisplayStream);

        for(const participant in get(remoteStreams)) {
            removeRemoteStream(participant);
        }

        // Unsubscribe from db listeners
        if(unsub) {
            unsub();
            unsub = null;
        }
        
        for(const participant in candidateUnsubs) {
            const candUnsub = candidateUnsubs[participant];
            candUnsub();
            
            delete candidateUnsubs[participant];
        }
        
        for(const participant in offerTimes) {
            delete offerTimes[participant];
        }
        
        for(const participant in answerTimes) {
            delete answerTimes[participant];
        }
        
        for(const participant in connectionDocRefs) {
            delete connectionDocRefs[participant];
        }
        
        for(const participant in dataChannels) {
            const dataChannel = dataChannels[participant];
            dataChannel.close();
            
            delete dataChannels[participant];
        }
        
        for(const participant in peerConnections) {
            const peerConnection = peerConnections[participant];
            peerConnection.close();
            
            delete peerConnections[participant];
        }

        await cleanUpDb();

        roomRef = null;
        roomId.set(null);

        inRoom.set(false);
    } catch(error) {
        console.error('Unable to exit room.', error);
        throw error;
    }
}

async function cleanUpDb() {
    // Retrieve connections associated with this uid
    const q = query(connectionsRef, or(
        where('from', '==', localUid),
        where('to', '==', localUid)
        ));
    
    const snapshot = await getDocs(q);

    snapshot.forEach(async (document) => {
        const remoteUid = document.data().to; // Retrieve the participant's uid

        const localCandidates = await getDocs(collection(db, document.ref.path, localUid));
        const remoteCandidates = await getDocs(collection(db, document.ref.path, remoteUid));

        const batch = writeBatch(db);

        // Delete each connection's candidate docs
        localCandidates.forEach(candidate => batch.delete(candidate.ref));
        remoteCandidates.forEach(candidate => batch.delete(candidate.ref));

        batch.delete(document.ref); // Delete the connection doc

        await batch.commit();
    });

    const roomDoc = await getDoc(roomRef);

    if(roomDoc.exists) {
        const participants = roomDoc.data().participants;

        // If there's more than one participant left, remove localUid from room doc
        // Otherwise, delete the room doc
        if(participants.length > 1) {
            const updateData = {
                participants: arrayRemove(localUid)
            };

            await updateDoc(roomRef, updateData);
            console.log('Deleted uid from room.');
        }else{
            await deleteDoc(roomRef);
            console.log('Deleted room.');
        }
    }
}

/**
 * @param {String} participant 
 */
async function createOffer(participant) {
    // Create a connection and map it to the participant
    const peerConnection = new RTCPeerConnection(config);
    peerConnections[participant] = peerConnection;

    registerPeerConnectionListeners(participant, peerConnection);

    // Create a data channel on the connection
    // (A channel or stream must be present for ICE candidate events to fire.)
    const dataChannel = peerConnection.createDataChannel('messages');
    dataChannels[participant] = dataChannel;

    // Add the local stream(s) tracks to the connection
    if(get(localStream)) {
        get(localStream).getTracks().forEach(track => {
            peerConnection.addTrack(track, get(localStream));
        });
    }

    if(get(localDisplayStream)) {
        get(localDisplayStream).getTracks().forEach(track => {
            peerConnection.addTrack(track, get(localDisplayStream));
        });
    }

    registerDataChannelListeners(participant, dataChannel);

    const connectionDocRef = doc(connectionsRef);
    connectionDocRefs[participant] = connectionDocRef;

    collectIceCandidates(connectionDocRef, participant, peerConnection);

    // Create an offer and use it to set the local description
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);

    console.log(`Created offer for participant '${participant}':`, offer);

    offerTimes[participant] = new Date();

    const connectionData = {
        from: localUid,
        to: participant,
        offerTime: Timestamp.fromDate(offerTimes[participant]),
        offer: {
            type: offer.type,
            sdp: offer.sdp
        },
        answerTime: null,
        answer: null
    };

    // Send the offer to the signaling channel
    await setDoc(connectionDocRef, connectionData);
    console.log(`Created connection doc(${connectionDocRef.id}) with offer for participant '${participant}'.`)
}

/**
 * 
 * @param {String} participant 
 * @param {DocumentSnapshot} connectionDoc 
 */
async function createAnswer(participant, connectionDoc) {
    let peerConnection;

    if(!peerConnections[participant]) {
        connectionDocRefs[participant] = connectionDoc.ref;

        // Create a connection
        peerConnection = new RTCPeerConnection(config);
        peerConnections[participant] = peerConnection;

        registerPeerConnectionListeners(participant, peerConnection);

        // Listen for data channels
        peerConnection.ondatachannel = (event) => {
            const { channel } = event;
            dataChannels[participant] = channel;

            registerDataChannelListeners(participant, channel);
        };

        // Queue adding tracks for later so that renegotiation is triggered
        // (This helps address the issue of the offerer not receiving the answerer's tracks
        // when the offerer hasn't created any media streams on the connection)
        if(get(localStream)) localStreamQueue.push(participant);
        if(get(localDisplayStream)) localDisplayStreamQueue.push(participant);

        collectIceCandidates(connectionDoc.ref, participant, peerConnection);
    } else {
        peerConnection = peerConnections[participant];
    }

    const connectionData = connectionDoc.data();

    // Use the offer to set the remote description
    const offer = new RTCSessionDescription(connectionData.offer);
    await peerConnection.setRemoteDescription(offer);

    // Create an answer and use it to set the local description
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);

    answerTimes[participant] = new Date();

    const answerData = {
        answerTime: Timestamp.fromDate(answerTimes[participant]),
        answer: {
            type: answer.type,
            sdp: answer.sdp
        }
    };

    // Send the answer to the signaling channel
    await updateDoc(connectionDoc.ref, answerData);
    console.log(`Updated connection doc(${connectionDoc.id}) with answer for participant '${participant}'.`);
}

/**
 * @param {String} participant 
 * @param {RTCPeerConnection} peerConnection 
 */
async function renegotiateOffer(participant, peerConnection) {
    // Create a new offer
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);

    console.log(`Renegotiating offer to participant '${participant}'.`, offer);

    offerTimes[participant] = new Date();

    const connectionData = {
        from: localUid,
        to: participant,
        offerTime: Timestamp.fromDate(offerTimes[participant]),
        offer: {
            type: offer.type,
            sdp: offer.sdp
        },
        answerTime: null,
        answer: null
    };

    const connectionDocRef = connectionDocRefs[participant];

    // Send the offer to the signaling channel
    await updateDoc(connectionDocRef, connectionData);
    console.log(`Updated connection doc(${connectionDocRef.id}) with offer for participant '${participant}'.`);
}

function addNegotiator() {
    unsub = onSnapshot(connectionsRef, (snapshot) => {
        snapshot.docChanges().forEach(async (change) => {
            if(change.type === 'removed') return;

            const data = change.doc.data();

            const hasNewAnswer = data.from === localUid && data.answer && (!answerTimes[data.to] || answerTimes[data.to].getTime() !== data.answerTime.toDate().getTime());

            const hasNewOffer = data.to === localUid && data.offer && (!offerTimes[data.from] || offerTimes[data.from].getTime() != data.offerTime.toDate().getTime());

            if(hasNewAnswer) {
                console.log('Received new answer.', data.answer, data);

                const participant = data.to;
                const peerConnection = peerConnections[participant];

                answerTimes[participant] = data.answerTime.toDate(); // Update participant's local answer time

                const answer = new RTCSessionDescription(data.answer);
                await peerConnection.setRemoteDescription(answer);
            } else if(hasNewOffer) {
                console.log('Received new offer.', data.offer, data);

                const participant = data.from;

                offerTimes[participant] = data.offerTime.toDate(); // Update participant's local offer time

                createAnswer(participant, change.doc);
            }
        });
    });
}

/**
 * @param {String} participant 
 * @param {RTCPeerConnection} peerConnection 
 */
function registerPeerConnectionListeners(participant, peerConnection) {
    peerConnection.ontrack = ({ track, streams }) => {
        console.log(`Got ${streams.length} streams from participant '${participant}'.`);

        remoteStreamQueue.push(...streams);

        processRemoteStreamQueues(participant);
    };

    peerConnection.onnegotiationneeded = (event) => {
        console.log(`Negotiation needed for participant '${participant}'.`);

        // Create new offers to connected participants
        if(peerConnection.connectionState === 'connected') {
            renegotiateOffer(participant, peerConnection);
        }
    };

    peerConnection.onicegatheringstatechange = (event) => {
        console.log(`ICE gathering state change for participant '${participant}': ${peerConnection.iceGatheringState}`);
    };

    peerConnection.onconnectionstatechange = (event) => {
        try{
            console.log(`Connection state change for participant '${participant}': ${peerConnection.connectionState}`);

            if(peerConnection.connectionState === 'connected') {
                // Add the local stream(s) tracks to the connection if they're queued
                if(localStreamQueue.includes(participant)) {
                    console.log(`Adding '${participant}'s queued tracks to connection`);
                    processLocalStreamQueue(participant, peerConnection, localStreamQueue, get(localStream));
                }

                if(localDisplayStreamQueue.includes(participant)) {
                    console.log(`Adding '${participant}'s queued display tracks to connection`);
                    processLocalStreamQueue(participant, peerConnection, localDisplayStreamQueue, get(localDisplayStream));
                }
            }
        } catch(error) {
            console.warn(error);
        }
    };

    peerConnection.onsignalingstatechange = (event) => {
        console.log(`Signaling state change for '${participant}': ${peerConnection.signalingState}`);
    };

    peerConnection.oniceconnectionstatechange = (event) => {
        console.log(`ICE connection state change for participant '${participant}': ${peerConnection.iceConnectionState}`);
    };
}

/**
 * @param {String} participant 
 * @param {RTCDataChannel} dataChannel 
 */
function registerDataChannelListeners(participant, dataChannel) {
    dataChannel.onopen = (event) => {
        console.log(`Data channel opened to participant '${participant}'.`);

        const message = {
            type: 'info',
            category: 'connection-established',
            user: localUid,
            username: get(username),
            content: `Connected to ${get(username)}`
        };

        dataChannel.send(JSON.stringify(message));

        sendStreamInfo(participant, 'media', localStream);
        sendStreamInfo(participant, 'display', localDisplayStream);

        if(!get(sendEnabled)) sendEnabled.set(true);
    };

    dataChannel.onclose = (event) => {
        console.log(`Data channel closed to participant '${participant}'.`);

        onParticipantDisconnected(participant);

        // Check for any remaining available data channels
        for(const participant in dataChannels) {
            const channel = dataChannels[participant];
            const channelStatus = channel.readyState;

            // Keep the send button active if an available channel is found
            if(channelStatus === 'connecting' || channelStatus === 'open') return;
        }

        sendEnabled.set(false);
    };

    dataChannel.onmessage = (event) => {
        const message = JSON.parse(event.data);
        console.log(`Message received from participant '${participant}':`, message);

        switch(message.type) {
            case 'info':
                if(message.category === 'connection-established') {
                    participantNames[participant] = message.username;
                }
                break;

            case 'system':
                processSystemMsg(participant, message);
                break;
        }

        messages.set([...get(messages), message]);
    };

    dataChannel.onerror = (event) => {
        // @ts-ignore
        const { error } = event;
        console.warn(`Data channel error for participant '${participant}'.`, error);
    };
}

/**
 * @param {import ('firebase/firestore').DocumentReference} connectionDocRef 
 * @param {String} participant 
 * @param {RTCPeerConnection} peerConnection 
 */
function collectIceCandidates(connectionDocRef, participant, peerConnection) {
    const localCandidateColl = collection(db, connectionDocRef.path, localUid);
    const remoteCandidateColl = collection(db, connectionDocRef.path, participant);

    peerConnection.onicecandidate = async (event) => {
        try {
            const { candidate } = event;
            if(!candidate) return;

            console.log(`Got candidate for participant '${participant}'.`, candidate);

            // Send candidate to signaling channel
            await addDoc(localCandidateColl, candidate.toJSON());
        } catch(error) {
            console.error('Unable to add local candidate.', error);
        }
    };

    // Listen to signaling channel for remote candidates
    const unsub = onSnapshot(remoteCandidateColl, (snapshot) => {
        snapshot.docChanges().forEach(async (change) => {
            if(change.type !== 'added') return;

            const data = change.doc.data();
            console.log(`Got remote candidate for participant '${participant}':`, data);

            try {
                await peerConnection.addIceCandidate(new RTCIceCandidate(data));
            } catch(error) {
                console.error(`Unable to add remote ICE candidate for participant '${participant}'.`, error);
            }
        });
    });

    candidateUnsubs[participant] = unsub;
}

/**
 * @param {String} content 
 */
export function sendMessage(content) {
    const message = {
        type: 'message',
        user: localUid,
        username: get(username),
        content
    };

    // Send message to all data channels
    for(const participant in dataChannels) {
        const dataChannel = dataChannels[participant];
        dataChannel.send(JSON.stringify(message));
    }

    messages.set([...get(messages), message]);
}

/**
 * @param {String} participant 
 * @param {String} streamType - 'media' / 'display'
 * @param {import('svelte/store').Writable} streamStore 
 */
function sendStreamInfo(participant, streamType, streamStore) {
    if(!dataChannels[participant]) {
        console.warn(`No data channel to send stream info to '${participant}'.`, dataChannels);
        return;
    }

    const stream = get(streamStore);

    if(!stream) return;

    const peerConnection = peerConnections[participant];

    try {
        stream.getTracks().forEach(track => peerConnection.addTrack(track, stream));
    } catch(error) {
        console.error(`Unable to add tracks for '${participant}'.`, error);
    }

    const message = {
        type: 'system',
        category: 'stream-info',
        streamId: stream.id,
        streamType,
        username: get(username)
    };

    // Send the stream info(s) to the participant
    const dataChannel = dataChannels[participant];
    dataChannel.send(JSON.stringify(message));
}

/**
 * @param {String} participant 
 * @param {*} message 
 */
function processSystemMsg(participant, message) {
    switch(message.category) {
        case 'refresh-stream':
            removeRemoteStream(participant);
            break;
        
        case 'remove-stream':
            const streams = get(remoteStreams);
            const participantStreams = streams[participant];
            streams[participant] = participantStreams.filter(s => s.stream.id !== message.streamId);

            remoteStreams.set(streams);
            break;

        case 'stream-info':
            const streamInfo = {
                username: message.username,
                streamType: message.streamType,
                streamId: message.streamId
            };

            remoteStreamInfos.push(streamInfo);
            processRemoteStreamQueues(participant);
            break;

        default:
            console.error(participant, 'Invalid system message', message);
    }
}

export async function startStream() {
    if(get(localStream)) return;

    const stream = await navigator.mediaDevices.getUserMedia(get(streamConstraints));
    localStream.set(stream);

    for(const participant in dataChannels) {
        sendStreamInfo(participant, 'media', localStream);
    }
}

export async function startDisplayStream() {
    if(get(localDisplayStream)) return;
    
    const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
    localDisplayStream.set(stream);

    for(const participant in dataChannels) {
        sendStreamInfo(participant, 'display', localDisplayStream);
    }
}

async function refreshStream() {
    const message = {
        type: 'system',
        category: 'refresh-stream'
    };

    // Signal connected participants to remove the current stream
    for(const participant in dataChannels) {
        const dataChannel = dataChannels[participant];
        dataChannel.send(JSON.stringify(message));
    }

    // Stop the stream locally, then create a new one
    stopStream(localStream);
    await startStream();

    // Add the new stream's tracks to the connection(s)
    get(localStream).getTracks().forEach(track => {
        for(const participant in peerConnections) {
            peerConnections[participant].addTrack(track, get(localStream));
        }
    });
}

/**
 * @param {import('svelte/store').Writable} streamStore 
 */
export function stopStream(streamStore) {
    if(!get(streamStore)) return;

    const message = {
        type: 'system',
        category: 'remove-stream',
        streamId: get(streamStore).id
    };

    get(streamStore).getTracks().forEach(track => track.stop());
    streamStore.set(null);

    // Signal connected participants to remove the specified stream
    for(const participant in dataChannels) {
        const dataChannel = dataChannels[participant];
        dataChannel.send(JSON.stringify(message));
    }
}

function processLocalStreamQueue(participant, peerConnection, streamQueue, stream) {
    stream.getTracks().forEach(track => {
        peerConnection.addTrack(track, stream);
    });

    // Remove the participant from the stream queue
    const pos = streamQueue.indexOf(participant);
    streamQueue.splice(pos, 1);
}

function processRemoteStreamQueues(participant) {
    // Filter out inactive streams
    remoteStreamQueue = remoteStreamQueue.filter(stream => stream.active);

    // Check if there's matching stream info
    remoteStreamQueue.forEach(stream => {
        const streamInfo = remoteStreamInfos.find(info => info.streamId === stream.id);
        
        if(streamInfo) {
            const remoteStream = { 
                username: streamInfo.username, 
                streamType: streamInfo.streamType, 
                stream
            };

            addRemoteStream(participant, remoteStream);
        }
    });

    // Clean up the queues
    for(const particip in get(remoteStreams)) {
        const rStreams = get(remoteStreams)[particip];

        rStreams.forEach(rStream => {
            remoteStreamQueue = remoteStreamQueue.filter(stream => stream.id !== rStream.stream.id);
            remoteStreamInfos = remoteStreamInfos.filter(info => info.streamId !== rStream.stream.id);
        });
    }
}

function addRemoteStream(participant, remoteStream) {
    console.log(`Creating remote stream for participant '${participant}'.`, remoteStream);

    if(!remoteStreams[participant]) {
        const streams = {};
        streams[participant] = [remoteStream];

        remoteStreams.set(streams);
    }else{
        // Filter out any duplicates
        const streams = get(remoteStreams)[participant].filter(rStream => rStream.stream.id !== remoteStream.stream.id);

        streams[participant].push(remoteStream); // Store the remote stream

        remoteStreams.set(streams);
    }
}

function removeRemoteStream(participant) {
    if(!get(remoteStreams)[participant]) {
        console.warn(`No remote streams found for participant '${participant}'. Unable to remove.`);
        return;
    }

    const streams = get(remoteStreams);

    streams[participant].forEach(remoteStream => {
        remoteStream.stream.getTracks().forEach(track => track.stop());
        remoteStream.stream = null;
    });

    delete streams[participant];

    remoteStreams.set(streams);
}

/** 
 * @param {String} participant 
 */
function onParticipantDisconnected(participant) {
    removeRemoteStream(participant);

    // Unsubscribe from the participant's candidate collection
    const candUnsub = candidateUnsubs[participant];
    if(candUnsub) candUnsub();

    delete candidateUnsubs[participant];
    delete connectionDocRefs[participant];
    delete offerTimes[participant];
    delete answerTimes[participant];

    delete peerConnections[participant];
    delete dataChannels[participant];

    const message = {
        type: 'info',
        content: `Disconnected from ${participantNames[participant]}`
    };

    messages.set([...get(messages), message]);

    delete participantNames[participant];
}
