const configuration = {
    iceServers: [
        {urls: 'stun:stun.l.google.com:19302'}
    ]
};

let constraints = {video: false, audio: false};
let desiredConstraints = {video: true, audio: true};

const db = firebase.firestore();

let roomRef = null;
let connectionsRef = null;
const connectionDocRefs = {};

let localUid = Math.random().toString(36).slice(-8);
let username = null;

let unsub = null;
const candidateUnsubs = {};

const offerTimes = {};
const answerTimes = {};

const peerConnections = {};
const dataChannels = {};

let localStream = null;
let localDisplayStream = null;
const remoteStreams = {};

const localStreamQueue = [];
const localDisplayStreamQueue = [];

const participantNames = {};

let modalAction = null;
let pendingConstraintChanges = false;

const pendingConstraintsEvent = new Event('pending-constraints');

const roomIdInput = document.querySelector('#room-id-input');
const userAvatar = document.querySelector('#user-avatar');

const createRoomBtn = document.querySelector('#create-room');
const joinRoomBtn = document.querySelector('#join-room');
const hangUpBtn = document.querySelector('#hang-up');

const streamOptsForm = document.querySelector('#stream-options');
const audioEnabledCheck = document.querySelector('#audio-enabled');
const videoEnabledCheck = document.querySelector('#video-enabled');
const screenShareEnabledCheck = document.querySelector('#screen-share-enabled');

const streamArea = document.querySelector('#stream-area');
const videoTemplate = document.querySelector('#template-video');

const chatArea = document.querySelector('#chat-area');
const msgContainer = document.querySelector('#messages-container');
const msgInput = document.querySelector('#message-input');
const sendBtn = document.querySelector('#send');

const msgTemplate = document.querySelector('#template-msg');
const msgSelfTemplate = document.querySelector('#template-msg-self');
const msgInfoTemplate = document.querySelector('#template-msg-info');

const toast = document.querySelector('.toast');

const usernameModal = document.querySelector('#username-modal');
const shareModal = document.querySelector('#share-modal');
const inputDeviceModal = document.querySelector('#input-device-modal')

const usernameField = document.querySelector('#username');

async function createRoom() {
    if(constraints.audio || constraints.video) await startStream();
    if(screenShareEnabledCheck.checked) await startDisplayStream();

    roomRef = db.collection('pearmo-rooms').doc();
    connectionsRef = roomRef.collection('connections');

    roomIdInput.value = roomRef.id;

    // Create room doc w/ local uid and created time
    const roomData = {
        participants: [localUid],
        created: firebase.firestore.FieldValue.serverTimestamp()
    };

    const res = await roomRef.set(roomData);
    console.log(`Created room. id: ${roomRef.id}`, res);

    addNegotiator();

    // Update the UI
    createRoomBtn.disabled = true;
    joinRoomBtn.disabled = true;
    hangUpBtn.disabled = false;

    adjustCommAreaUi();
}

async function joinRoom() {
    // Check for a room id to join
    if(!roomIdInput.value) {
        const warning = 'No room id to join';
        console.warn(warning);
        popToast('warning', warning);
        return;
    }

    roomRef = db.collection('pearmo-rooms').doc(roomIdInput.value);
    connectionsRef = roomRef.collection('connections');

    const doc = await roomRef.get();

    if(!doc.exists) {
        const warning = 'Room not found';
        console.warn(warning);
        popToast('warning', warning);
        return;
    }

    if(constraints.audio || constraints.video) await startStream();
    if(screenShareEnabledCheck.checked) await startDisplayStream();

    // Retrieve the room data
    const roomData = doc.data();
    console.log('Room', doc.id, roomData);

    // Check for uid overlap (This should rarely need to be called if ever)
    while(roomData.participants.includes(localUid)) {
        localUid = Math.random().toString(36).slice(-8);
        console.warn(`Uid conflict. New uid created: ${localUid}`);
    }

    // Update the room document
    const updateData = {
        participants: firebase.firestore.FieldValue.arrayUnion(localUid)
    };

    const res = await roomRef.update(updateData);
    console.log('Updated room.', res);

    // Create offers
    roomData.participants.forEach(participant => createOffer(participant));

    addNegotiator();

    // Update the UI
    createRoomBtn.disabled = true;
    joinRoomBtn.disabled = true;
    hangUpBtn.disabled = false;

    adjustCommAreaUi();
}

function addNegotiator() {
    unsub = connectionsRef.onSnapshot(snapshot => {
        snapshot.docChanges().forEach(async change => {
            if(change.type === 'removed') return; // Ignore documents being removed

            const data = change.doc.data();

            if(data.from && data.from === localUid && data.answer && (!answerTimes[data.to] || answerTimes[data.to].getTime() != data.answerTime.toDate().getTime())) {
                console.log('Received new answer.', data.answer, data);

                const participant = data.to;
                const peerConnection = peerConnections[participant];

                // Update the participant's local answer time
                answerTimes[participant] = data.answerTime.toDate();

                const remoteDesc = new RTCSessionDescription(data.answer);
                await peerConnection.setRemoteDescription(remoteDesc);
            }else if(data.to && data.to === localUid && data.offer && (!offerTimes[data.from] || offerTimes[data.from].getTime() != data.offerTime.toDate().getTime())) {
                console.log('Received new offer.', data.offer, data);

                const participant = data.from;

                // Update the participant's local offer time
                offerTimes[participant] = data.offerTime.toDate();

                createAnswer(participant, change.doc);
            }
        });
    }, error => {
        console.error('Error listening to connections collection.\n', error);
    });
}

async function createOffer(participant) {
    // Create a connection
    const peerConnection = new RTCPeerConnection(configuration);
    peerConnections[participant] = peerConnection; // Map the connection to the participant

    registerPeerConnectionListeners(participant, peerConnection);

    // Create a data channel on the connection
    // (A channel or stream must be present for ICE candidate events to fire)
    const dataChannel = peerConnection.createDataChannel('messages');
    dataChannels[participant] = dataChannel; // Map the data channel to the participant

    // Add the local stream(s) tracks to the connection
    if(localStream) {
        localStream.getTracks().forEach(track => {
            peerConnection.addTrack(track, localStream);
        });
    }

    if(localDisplayStream) {
        localDisplayStream.getTracks().forEach(track => {
            peerConnection.addTrack(track, localDisplayStream);
        });
    }

    registerDataChannelListeners(participant, dataChannel);

    const connectionDocRef = connectionsRef.doc(); // Create connection doc ref
    connectionDocRefs[participant] = connectionDocRef;

    // Start collecting ICE candidates
    await collectIceCandidates(connectionDocRef, participant, peerConnection);

    // Create an offer and use it to set the local description
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    console.log(participant, 'Created offer', offer);

    offerTimes[participant] = new Date(); // Map the offer time to the participant

    const connectionData = {
        from: localUid,
        to: participant,
        offerTime: firebase.firestore.Timestamp.fromDate(offerTimes[participant]),
        offer: {
            type: offer.type,
            sdp: offer.sdp
        },
        answerTime: null,
        answer: null
    };

    // Send the offer to the signaling channel
    const res = await connectionDocRef.set(connectionData);
    console.log(participant, `Created connection doc with offer. id: ${connectionDocRef.id}`, res);
}

async function createAnswer(participant, connectionDoc) {
    let peerConnection;

    if(!peerConnections[participant]) {
        connectionDocRefs[participant] = connectionDoc.ref;

        // Create a connection
        peerConnection = new RTCPeerConnection(configuration);
        peerConnections[participant] = peerConnection; // Map the connection to the participant

        registerPeerConnectionListeners(participant, peerConnection);

        // Listen for data channels
        peerConnection.addEventListener('datachannel', event => {
            const dataChannel = event.channel;
            dataChannels[participant] = dataChannel; // Map the data channel to the participant

            registerDataChannelListeners(participant, dataChannel);
        });

        // Queue adding tracks for later so that renegotiation is triggered
        // (This helps address the issue of the offerer not receiving the answerer's tracks
        // when the offerer hasn't created any media streams on the connection)
        if(localStream) localStreamQueue.push(participant);
        if(localDisplayStream) localDisplayStreamQueue.push(participant);

        // Start collecting ICE candidates
        await collectIceCandidates(connectionDoc.ref, participant, peerConnection);
    }else{
        peerConnection = peerConnections[participant];
    }

    const connectionData = connectionDoc.data();

    // Use the offer to create the remote description
    const remoteDesc = new RTCSessionDescription(connectionData.offer);
    await peerConnection.setRemoteDescription(remoteDesc);

    // Create an answer and use it to set the local description
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);

    answerTimes[participant] = new Date();

    const answerData = {
        answerTime: firebase.firestore.Timestamp.fromDate(answerTimes[participant]),
        answer: {
            type: answer.type,
            sdp: answer.sdp
        }
    };

    // Send the answer to the signaling channel
    const res = await connectionDoc.ref.update(answerData);
    console.log(participant, `Updated connection doc with answer. id: ${connectionDoc.ref.id}`, res);
}

async function renegotiateOffer(participant, peerConnection) {
    // Create a new offer
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    console.log(participant, 'Renegotiating offer', offer);

    offerTimes[participant] = new Date(); // Map the offer time to the participant

    const connectionData = {
        from: localUid,
        to: participant,
        offerTime: firebase.firestore.Timestamp.fromDate(offerTimes[participant]),
        offer: {
            type: offer.type,
            sdp: offer.sdp
        },
        answerTime: null,
        answer: null
    };

    const connectionDocRef = connectionDocRefs[participant];

    // Send the offer to the signaling channel
    const res = await connectionDocRef.set(connectionData, {merge: true});
    console.log(participant, `Updated connection doc with offer. id: ${connectionDocRef.id}`, res);
}

async function collectIceCandidates(connectionDocRef, participant, peerConnection) {
    const localCandidatesColl = connectionDocRef.collection(localUid);
    const remoteCandidatesColl = connectionDocRef.collection(participant);

    peerConnection.addEventListener('icecandidate', event => {
        if(event.candidate) {
            console.log(participant, 'Got candidate', event.candidate);

            // Send candidate to signaling channel
            localCandidatesColl.add(event.candidate.toJSON());
        }
    });

    // Listen to signaling channel for remote candidates
    const candUnsub = remoteCandidatesColl.onSnapshot(snapshot => {
        snapshot.docChanges().forEach(async change => {
            if(change.type === 'added') {
                const data = change.doc.data();
                console.log(participant, 'Got remote candidate', data);

                try {
                    await peerConnection.addIceCandidate(new RTCIceCandidate(data));
                } catch (error) {
                    console.error(participant, 'Error adding remote ICE candidate.', error.name, error);
                }
            }
        });
    });

    candidateUnsubs[participant] = candUnsub;
}

function registerPeerConnectionListeners(participant, peerConnection) {
    peerConnection.addEventListener('track', event => {
        console.log(participant, `Got ${event.streams.length} remote track(s)`, event.streams);

        if(!remoteStreams[participant]) addRemoteStream(participant, event.streams[0]);
        const remoteStream = remoteStreams[participant];

        // Set/Refresh the video element's src
        const remoteVideo = document.querySelector(`#remote-video-${participant}`);
        remoteVideo.srcObject = remoteStream;
    });

    peerConnection.addEventListener('negotiationneeded', async event => {
        console.log(participant, 'Negotiation needed');

        // Create new offers to connected participants
        if(peerConnection.connectionState === 'connected') renegotiateOffer(participant, peerConnection);
    });

    peerConnection.addEventListener('icegatheringstatechange', event => {
        console.log(participant, `ICE gathering state change: ${peerConnection.iceGatheringState}`);
    });

    peerConnection.addEventListener('connectionstatechange', event => {
        console.log(participant, `Connection state change: ${peerConnection.connectionState}`);

        // Add the local stream's tracks to the connection if they're queued
        if(peerConnection.connectionState === 'connected' && streamQueue.includes(participant)) {
            console.log(participant, 'Adding queued tracks to connection');
            
            localStream.getTracks().forEach(track => {
                peerConnection.addTrack(track, localStream);
            });

            // Remove the participant from the stream queue
            const pos = streamQueue.indexOf(participant);
            streamQueue.splice(pos, 1);
        }
    });

    peerConnection.addEventListener('signalingstatechange', event => {
        console.log(participant, `Signaling state change: ${peerConnection.signalingState}`);
    });

    peerConnection.addEventListener('iceconnectionstatechange', event => {
        console.log(participant, `ICE connection state change: ${peerConnection.iceConnectionState}`);
    });
}

function registerDataChannelListeners(participant, dataChannel) {
    function participantDisconnected() {
        removeRemoteStream(participant);

        // Unsubscribe from the particpant's candidates
        const candUnsub = candidateUnsubs[participant];
        if(candUnsub) candUnsub();

        // Remove the participant's associated references and info
        delete candidateUnsubs[participant];
        delete connectionDocRefs[participant];
        delete offerTimes[participant];
        delete answerTimes[participant];

        delete dataChannels[participant];
        delete peerConnections[participant];

        // Show disconnect message
        const disconnectMsg = `Disconnected from ${participantNames[participant]}`;

        const msgEl = msgInfoTemplate.content.firstElementChild.cloneNode(true);
        msgEl.querySelector('.msg-content').innerText = disconnectMsg;

        msgContainer.appendChild(msgEl);
        msgEl.scrollIntoView();

        delete participantNames[participant]; // Remove the participant's username
    }

    dataChannel.addEventListener('open', event => {
        console.log(participant, 'Data channel open');

        const message = {
            type: 'info',
            category: 'hello',
            username: username,
            content: `Connected to ${username}`
        };

        dataChannel.send(JSON.stringify(message));

        if(sendBtn.disabled) sendBtn.disabled = false; // Enable the send button if it's disabled
    });

    dataChannel.addEventListener('close', event => {
        console.log(participant, 'Data channel close');

        participantDisconnected();

        // Check for any remaining available data channels
        for(const participant in dataChannels) {
            const channel = dataChannels[participant];
            const channelStatus = channel.readyState;

            // Keep the send button active if an available channel is found
            if(channelStatus === 'connecting' || channelStatus === 'open') return;
        }

        sendBtn.disabled = true; // Disable the send button if there are no available data channels
    });

    dataChannel.addEventListener('message', event => {
        console.log(participant, 'Message received: ', JSON.parse(event.data));

        const message = JSON.parse(event.data);

        let template;
        switch(message.type) {
            case 'message':
                template = msgTemplate;
                break;

            case 'info':
                if(message.category === 'hello') participantNames[participant] = message.username;
                template = msgInfoTemplate;
                break;

            case 'system':
                if(message.category === 'refresh-stream') removeRemoteStream(participant);
                return;

            default:
                console.error('Invalid message type');
                return;
        }

        // Add the message element to the message container
        const msgEl = template.content.firstElementChild.cloneNode(true);
        msgEl.querySelector('.msg-content').innerText = message.content;

        if(message.type === 'message') msgEl.querySelector('.msg-username').innerText = message.username;

        msgContainer.appendChild(msgEl);
        msgEl.scrollIntoView();
    });

    dataChannel.addEventListener('error', event => {
        const err = event.error;
        console.warn(participant, 'Data channel error', err, err.message, err.errorDetail, err.sctpCauseCode);
    });
}

function sendMsg() {
    const message = {
        type: 'message',
        username: username,
        content: msgInput.value
    };

    // Send message to all data channels
    for(participant in dataChannels) {
        const dataChannel = dataChannels[participant];
        dataChannel.send(JSON.stringify(message));
    }

    // Add the message element to the message container
    const msgEl = msgSelfTemplate.content.firstElementChild.cloneNode(true);
    msgEl.querySelector('.msg-username').innerText = username;
    msgEl.querySelector('.msg-content').innerText = msgInput.value;

    msgContainer.appendChild(msgEl);
    msgEl.scrollIntoView();

    msgInput.value = ''; // Clear the message input field
}

async function startStream() {
    try {
        localStream = await navigator.mediaDevices.getUserMedia(constraints);

        // Add a video element to the stream area
        const localVideo = videoTemplate.content.firstElementChild.cloneNode(true);
        localVideo.id = 'local-video';
        localVideo.muted = true;
        localVideo.srcObject = localStream;

        if(streamArea.hasChildNodes()) {
            streamArea.insertBefore(localVideo, streamArea.firstChild);
        }else{
            streamArea.appendChild(localVideo);
        }

        adjustCommAreaUi();
    } catch (error) {
        console.error('Error starting stream.', error);
    }
}

async function startDisplayStream() {
    try {
        localDisplayStream = await navigator.mediaDevices.getDisplayMedia({video: true, audio: true});

        // Add a video element to the stream area
        const localDisplayVideo = videoTemplate.content.firstElementChild.cloneNode(true);
        localDisplayVideo.id = 'local-display-video';
        localDisplayVideo.muted = true;
        localDisplayVideo.srcObject = localDisplayStream;

        const localVideo = streamArea.querySelector('#local-video');

        if(localVideo) {
            streamArea.insertBefore(localDisplayVideo, localVideo.nextSibling);
        }else if(streamArea.hasChildNodes()) {
            streamArea.insertBefore(localDisplayVideo, streamArea.firstChild);
        }else{
            streamArea.appendChild(localDisplayVideo);
        }

        adjustCommAreaUi();
    } catch (error) {
        console.error('Error starting display stream.', error);
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
    stopStream();
    await startStream();

    // Add the new stream's tracks to the connection(s)
    localStream.getTracks().forEach(track => {
        for(const participant in peerConnections) {
            peerConnections[participant].addTrack(track, localStream);
        }
    });
}

function stopStream() {
    localStream.getTracks().forEach(track => track.stop());

    let localVideo = document.querySelector('#local-video');

    // Set srcObject to null to sever the link with the MediaStream so it can be released
    localVideo.srcObject = null;

    localStream = null;

    // Remove the video element from the stream area and remove the element reference
    localVideo.remove();
    localVideo = null;

    adjustCommAreaUi();
}

function stopDisplayStream() {
    localDisplayStream.getTracks().forEach(track => track.stop());

    let localDisplayVideo = document.querySelector('#local-display-video');

    // Set srcObject to null to sever the link with the MediaStream so it can be released
    localDisplayVideo.srcObject = null;

    localDisplayStream = null;

    // Remove the video element from the stream area and remove the element reference
    localDisplayVideo.remove();
    localDisplayVideo = null;

    adjustCommAreaUi();
}

function addRemoteStream(participant, remoteStream) {
    console.log(participant, 'Creating new remote stream');

    // Store the remote stream
    remoteStreams[participant] = remoteStream;

    // Add video element to stream area
    const remoteVideo = videoTemplate.content.firstElementChild.cloneNode(true);
    remoteVideo.id = `remote-video-${participant}`;

    streamArea.appendChild(remoteVideo);

    adjustCommAreaUi();
}

function removeRemoteStream(participant) {
    let remoteStream = remoteStreams[participant];

    if(!remoteStream) {
        console.warn(participant, 'No remote stream found. Unable to remove.');
        return;
    }

    remoteStream.getTracks().forEach(track => track.stop());

    let remoteVideo = document.querySelector(`#remote-video-${participant}`);

    // Set srcObject to null to sever the link with the MediaStream so it can be released
    remoteVideo.srcObject = null;

    remoteStream = null;
    delete remoteStreams[participant];

    // Remove the video element from the stream area and remove the element reference
    remoteVideo.remove();
    remoteVideo = null;

    adjustCommAreaUi();
}

function hangUp() {
    // Stop streams
    if(localStream) stopStream();
    if(localDisplayStream) stopDisplayStream();

    for(const participant in remoteStreams) {
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

    cleanUpDb();

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

        delete dataChannels[participant]; // Remove the data channel from the global variable
    }

    for(const participant in peerConnections) {
        const peerConnection = peerConnections[participant];
        peerConnection.close();

        delete peerConnections[participant]; // Remove the peer connection from the global variable
    }

    // Update the UI
    createRoomBtn.disabled = false;
    joinRoomBtn.disabled = false;
    hangUpBtn.disabled = true;

    adjustCommAreaUi();
}

async function cleanUpDb() {
    // Retrieve connections authored by this uid
    const authoredConnections = await connectionsRef.where('from', '==', localUid).get();

    authoredConnections.forEach(async connection => {
        const remoteUid = connection.data().to; // Retrieve the participant's uid

        const localCandidates = await connection.ref.collection(localUid).get();
        const remoteCandidates = await connection.ref.collection(remoteUid).get();

        const batch = db.batch();

        // Delete each connection's candidate docs
        localCandidates.forEach(candidate => batch.delete(candidate.ref));
        remoteCandidates.forEach(candidate => batch.delete(candidate.ref));

        batch.delete(connection.ref); // Delete the connection doc

        await batch.commit();
    });

    const roomDoc = await roomRef.get();

    if(roomDoc.exists) {
        const participants = roomDoc.data().participants;

        // If there's more than one participant left, remove localUid from room doc
        // Otherwise, delete the room doc
        if(participants.length > 1) {
            const updateData = {
                participants: firebase.firestore.FieldValue.arrayRemove(localUid)
            };

            const res = await roomRef.update(updateData);
            console.log('Deleted uid from room.', res);
        }else{
            const res = await roomRef.delete();
            console.log('Deleted room.', res);
        }
    }
}

function popToast(type, message) {
    showToast(type, message);
    setTimeout(hideToast, 2000);
}

function showToast(type, message) {
    toast.innerText = message;

    let classes = ['toast-active'];

    switch(type) {
        case 'success':
            classes.push('toast-success');
            break;

        case 'warning':
            classes.push('toast-warning');
            break;

        case 'error':
            classes.push('toast-error');
            break;
    }

    toast.classList.add(...classes);
}

function hideToast() {
    const classes = ['toast-active', 'toast-primary', 'toast-success', 'toast-warning', 'toast-error'];
    toast.classList.remove(...classes);
}

function adjustCommAreaUi() {
    // Show/Hide the stream area
    if(audioEnabledCheck.checked || videoEnabledCheck.checked || screenShareEnabledCheck.checked || streamArea.hasChildNodes()) {
        streamArea.style.display = 'flex';
        chatArea.classList.remove('col-12');
        chatArea.classList.add('col-3');
    }else{
        streamArea.style.display = 'none';
        chatArea.classList.remove('col-3');
        chatArea.classList.add('col-12');
    }

    const streamVideos = document.querySelectorAll('#stream-area video');
    
    // Style the video elements to scale along with their amount
    if(streamVideos.length > 1) {
        streamVideos.forEach(video => {
            video.classList.remove('stream-video-single');
            video.classList.add('stream-video');
        });
    }else if(streamVideos.length === 1) {
        streamVideos[0].classList.remove('stream-video');
        streamVideos[0].classList.add('stream-video-single');
    }
}

function initUsernameModal() {
    // Show Create Username modal when avatar is clicked
    userAvatar.addEventListener('click', event => {
        usernameModal.classList.add('active');
        usernameField.focus(); // Request input focus
    });

    const usernameHint = document.querySelector('#username-modal .form-input-hint');
    const createUsernameBtn = document.querySelector('#create-username');

    const usernameExp = /^\w+$/; // Match alpha-numeric characters including underscores

    const validationMsg = 'Username can only contain letters, numbers, or underscores.';

    // Set the username and close the modal
    function createUsername() {
        username = document.querySelector('#username').value;

        userAvatar.dataset.initial = username.substr(0,2).toUpperCase(); // Set the avatar initials

        usernameModal.classList.remove('active');
        
        // If the modal was triggered by another action,
        // continue with that action
        switch(modalAction){
            case 'createRoom':
                createRoom();
                break;
            case 'joinRoom':
                joinRoom();
                break;
        }

        modalAction = null;
    }

    // Validate the username input and display the validation state
    usernameField.addEventListener('input', function(event) {
        const isValidLength = this.value.length >= 5;
        const isValidUsername = usernameExp.test(this.value);

        // Remove previous validation state
        this.classList.remove('is-success', 'is-error');
        usernameHint.innerText = '';

        // Display input validation if the length requirement has been met
        if(isValidLength) {
            const validationClass = isValidUsername ? 'is-success' : 'is-error';
            this.classList.add(validationClass);

            usernameHint.innerText = !isValidUsername ? validationMsg : '';
        }

        createUsernameBtn.disabled = !(isValidLength && isValidUsername);
    });

    usernameField.addEventListener('keypress', function(event) {
        if(event.key === 'Enter' && !createUsernameBtn.disabled) createUsername();
    });

    createUsernameBtn.addEventListener('click', createUsername);
}

function initShareModal() {
    // Show Share modal when share button is clicked
    document.querySelector('#share-id-btn').addEventListener('click', event => {
        if(!roomIdInput.value) {
            popToast('warning', 'No room id to share');
            return;
        }

        document.querySelector('#share-room-id').innerText = `Room ID: ${roomIdInput.value}`;
        shareModal.classList.add('active');
    });

    function copyToClipboard() {
        // Copy the value in the room id input field
        roomIdInput.select();
        document.execCommand('copy');

        window.getSelection().empty(); // Clear the selection
    }

    document.querySelector('#share-copy-link').addEventListener('click', event => {
        const roomId = roomIdInput.value;
        const shareLink = `${window.location.href}?room=${roomId}`;

        roomIdInput.value = shareLink; // Set the room id field to the share link
        copyToClipboard(); // Copy the share link
        roomIdInput.value = roomId; // Reset the room id field back to the room id

        shareModal.classList.remove('active');
    });

    document.querySelector('#share-copy').addEventListener('click', event => {
        copyToClipboard(); // Copy the room id
        shareModal.classList.remove('active');
    });
}

function initInputDeviceModal() {
    const videoSelect = document.querySelector('#video-device');
    const audioSelect = document.querySelector('#audio-device');

    async function showInputDeviceModal() {
        inputDeviceModal.classList.add('active');

        // Query the available devices
        const devices = await navigator.mediaDevices.enumerateDevices();
        console.log('Available devices', devices);

        // Filter 'videoinput' and 'audioinput' devices into respective arrays
        const videoInputDevices = devices.filter(device => device.kind === 'videoinput');
        const audioInputDevices = devices.filter(device => device.kind === 'audioinput');

        // Clear any previous options
        videoSelect.innerHTML = '';
        audioSelect.innerHTML = '';

        // Add the default option
        const defaultOption = document.createElement('option');
        defaultOption.text = 'Auto';
        defaultOption.value = 'auto';

        videoSelect.appendChild(defaultOption.cloneNode(true));
        audioSelect.appendChild(defaultOption.cloneNode(true));

        function addDeviceOption(selectEl, device) {
            if(device.label === '') return;

            const deviceOption = document.createElement('option');
            deviceOption.text = device.label;
            deviceOption.value = device.deviceId;

            const desiredAudio = desiredConstraints.audio.deviceId;
            const desiredVideo = desiredConstraints.video.deviceId;

            if(desiredAudio === device.deviceId || desiredVideo === device.deviceId) {
                deviceOption.selected = true;
            }

            selectEl.appendChild(deviceOption);
        }

        // Add the device options to their corresponding select elements
        videoInputDevices.forEach(device => addDeviceOption(videoSelect, device));
        audioInputDevices.forEach(device => addDeviceOption(audioSelect, device));
    }

    // Show the Input Device modal when the more options button is clicked 
    document.querySelector('#more-options').addEventListener('click', event => {
        event.preventDefault(); // Prevent the button from automatically trying to submit the Stream Options form

        showInputDeviceModal();
    });

    // Set desired constraints based on selected device options
    videoSelect.addEventListener('change', function(event) {
        desiredConstraints.video = (this.value === 'auto') ? true : {deviceId: this.value};

        if(videoEnabledCheck.checked) {
            constraints.video = desiredConstraints.video;
            pendingConstraintChanges = true; // Mark the device constraints as changed
        }
    });
    
    audioSelect.addEventListener('change', function(event) {
        desiredConstraints.audio = (this.value === 'auto') ? true : {deviceId: this.value};

        if(audioEnabledCheck.checked) {
            constraints.audio = desiredConstraints.audio;
            pendingConstraintChanges = true; // Mark the device constraints as changed
        }
    });

    inputDeviceModal.addEventListener('pending-constraints', event => {
        pendingConstraintChanges = false;

        if(!localStream) return;

        console.log('Updating stream with new constraints', constraints);
        refreshStream();
    });
}

function initStreamOptions() {
    async function createNewStream() {
        await startStream();

        // Add the new stream's tracks to the connection
        localStream.getTracks().forEach(track => {
            for(const participant in peerConnections) {
                peerConnections[participant].addTrack(track, localStream);
            }
        });
    }

    async function createNewDisplayStream() {
        await startDisplayStream();

        // Add the new stream's tracks to the connection
        localDisplayStream.getTracks().forEach(track => {
            for(const participant in peerConnections) {
                peerConnections[participant].addTrack(track, localDisplayStream);
            }
        });
    }

    audioEnabledCheck.addEventListener('change', function(event) {
        adjustCommAreaUi();

        constraints.audio = (this.checked) ? desiredConstraints.audio : false; // Update the media constraints

        if(createRoomBtn.disabled) {
            if(constraints.audio && !localStream) {
                createNewStream();
            }else if(constraints.audio && localStream && localStream.getAudioTracks().length === 0) {
                refreshStream();
            }else if(localStream && localStream.getAudioTracks().length > 0) {
                // Toggle audio tracks
                localStream.getAudioTracks().forEach(track => track.enabled = !track.enabled);
            }
        }
    });

    // Enable/Disable video options elements according to the video enabled element
    videoEnabledCheck.addEventListener('change', function(event) {
        adjustCommAreaUi();

        constraints.video = (this.checked) ? desiredConstraints.video : false; // Update the media constraints

        if(createRoomBtn.disabled) {
            if(constraints.video && !localStream) {
                createNewStream();
            }else if(constraints.video && localStream && localStream.getVideoTracks().length === 0) {
                refreshStream();
            }else if(localStream && localStream.getVideoTracks().length > 0) {
                // Toggle video tracks
                localStream.getVideoTracks().forEach(track => track.enabled = !track.enabled);
            }
        }
    });

    screenShareEnabledCheck.addEventListener('change', function(event) {
        adjustCommAreaUi();

        if(createRoomBtn.disabled) {
            if(this.checked && !localDisplayStream) {
                createNewDisplayStream();
            }else{
                // Toggle the display tracks
                localDisplayStream.getTracks().forEach(track => track.enabled = !track.enabled);
            }
        }
    });
}

function init() {
    // Populate the room id field if it's included in the url
    const searchParams = new URLSearchParams(location.search);
    if(searchParams.has('room')) roomIdInput.value = searchParams.get('room');

    // Hide all modals when a close element is clicked 
    document.querySelectorAll('.close-modal').forEach(closeElement => {
        closeElement.addEventListener('click', event => {
            event.preventDefault();

            // Dispatch a Pending Constraint event if the Input Device modal closed with options changed
            if(pendingConstraintChanges) inputDeviceModal.dispatchEvent(pendingConstraintsEvent);

            modalAction = null;

            document.querySelectorAll('.modal').forEach(modal => modal.classList.remove('active'));
        });
    });

    initUsernameModal();
    initShareModal();
    initInputDeviceModal();

    initStreamOptions();

    createRoomBtn.addEventListener('click', event => {
        if(!username) {
            modalAction = 'createRoom';
            usernameModal.classList.add('active');
            usernameField.focus(); // Request input focus
        }else{
            createRoom();
        }
    });

    joinRoomBtn.addEventListener('click', event => {
        if(!username) {
            modalAction = 'joinRoom';
            usernameModal.classList.add('active');
            usernameField.focus(); // Request input focus
        }else{
            joinRoom();
        }
    });

    hangUpBtn.addEventListener('click', hangUp);

    sendBtn.addEventListener('click', sendMsg);
    msgInput.addEventListener('keypress', event => {
        if(event.code === 'Enter' && event.ctrlKey && !sendBtn.disabled) sendMsg();
    });
}

init();