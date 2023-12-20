import { firebaseConfig } from './firebase-config';
import { initializeApp } from 'firebase/app';
import { getFirestore, addDoc, collection, serverTimestamp, deleteDoc, doc, onSnapshot, Timestamp, setDoc, DocumentSnapshot, updateDoc, getDoc, arrayUnion, query, where, getDocs, writeBatch, arrayRemove } from 'firebase/firestore';
import { inRoom, messages, roomId, sendEnabled, username } from './stores';
import { get } from 'svelte/store';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const config = {
    iceServers: [
        {urls: 'stun:stun.l.google.com:19302'}
    ]
};

const dbRoot = 'uvu';

let localUid = Math.random().toString(36).slice(-8);

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

export async function createRoom() {
    try {
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
    if(!get(roomId)) {
        console.warn('No room id to join.');
        return;
    }

    roomRef = doc(db, dbRoot, get(roomId));
    connectionsRef = collection(db, roomRef.path, 'connections');

    const snapshot = await getDoc(roomRef);

    if(!snapshot.exists()) {
        console.warn('Room not found.');
        return;
    }

    //// TODO: Streams

    // Retrieve the room data
    const roomData = snapshot.data();
    console.log('Room', snapshot.id, roomData);

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
}

export async function exitRoom() {
    try {
        if(!roomRef) throw new Error('Missing room ref.');

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
    // Retrieve connections authored by this uid
    const q = query(connectionsRef, where('from', '==', localUid));
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

    //// TODO: Register peer conn listeners

    // Create a data channel on the connection
    // (A channel or stream must be present for ICE candidate events to fire.)
    const dataChannel = peerConnection.createDataChannel('messages');
    dataChannels[participant] = dataChannel;

    //// TODO: Add stream tracks

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

        //// TODO: Register peer conn listeners

        // Listen for data channels
        peerConnection.ondatachannel = (event) => {
            const { channel } = event;
            dataChannels[participant] = channel;

            registerDataChannelListeners(participant, channel);
        };

        //// TODO: Add streams

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
    console.log(`Updated connection doc(${connectionDoc.id}) with answer for participant '${participant}'.`)
}

//// TODO: Renegotiate offer

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
 * @param {RTCDataChannel} dataChannel 
 */
function registerDataChannelListeners(participant, dataChannel) {
    dataChannel.onopen = (event) => {
        console.log(`Data channel opened to participant '${participant}'.`);

        const message = {
            type: 'info',
            category: 'hello',
            username: get(username),
            content: `Connected to ${get(username)}`
        };

        dataChannel.send(JSON.stringify(message));

        //// TODO: Send stream info?

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

        messages.set([...get(messages), message]);
    };

    dataChannel.onerror = (event) => {
        // @ts-ignore
        const { error } = event;
        console.warn(`Data channel error for participant '${participant}'.`, error);
    };
}

/** 
 * @param {String} participant 
 */
function onParticipantDisconnected(participant) {
    // Unsubscribe from the participant's candidate collection
    const candUnsub = candidateUnsubs[participant];
    if(candUnsub) candUnsub();

    delete candidateUnsubs[participant];
    delete connectionDocRefs[participant];
    delete offerTimes[participant];
    delete answerTimes[participant];

    delete peerConnections[participant];
    delete dataChannels[participant];
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
