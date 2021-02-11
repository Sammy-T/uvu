const db = firebase.firestore();

let roomRef = null;
let connectionsRef = null;

let createdRoom = false;

let localUid = Math.random().toString(36).slice(-8);
let username = null;

let modalAction = null;

const roomIdInput = document.querySelector('#room-id-input');
const userAvatar = document.querySelector('#user-avatar');
const createRoomBtn = document.querySelector('#create-room');
const joinRoomBtn = document.querySelector('#join-room');
const hangUpBtn = document.querySelector('#hang-up');
const audioEnabledCheck = document.querySelector('#audio-enabled');
const videoEnabledCheck = document.querySelector('#video-enabled');
const videoOptions = document.querySelectorAll('.video-option');
const usernameModal = document.querySelector('#username-modal');

async function createRoom() {
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

    createdRoom = true;

    //// TODO: Add negotiator

    // Update the UI
    createRoomBtn.disabled = true;
    joinRoomBtn.disabled = true;
    hangUpBtn.disabled = false;
    videoOptions.forEach(optionEl => optionEl.disabled = true);
}

async function joinRoom() {
    // Check for a room id to join
    if(!roomIdInput.value) {
        console.warn('No room id to join.');
        return;
    }

    roomRef = db.collection('pearmo-rooms').doc(roomIdInput.value);
    connectionsRef = roomRef.collection('connections');

    const doc = await roomRef.get();

    if(!doc.exists) {
        console.warn('No room found.');
        return;
    }

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

    //// TODO: Add negotiator / create offers

    // Update the UI
    createRoomBtn.disabled = true;
    joinRoomBtn.disabled = true;
    hangUpBtn.disabled = false;
    videoOptions.forEach(optionEl => optionEl.disabled = true);
}

function hangUp() {
    cleanUpDb();

    // Update the UI
    createRoomBtn.disabled = false;
    joinRoomBtn.disabled = false;
    hangUpBtn.disabled = true;
    videoOptions.forEach(optionEl => optionEl.disabled = !videoEnabledCheck.checked);
}

async function cleanUpDb() {
    const roomDoc = await roomRef.get();

    if(roomDoc.exists) {
        const participants = roomDoc.data().participants;

        // If there are more than 2 participants left, remove localUid from room doc
        // Otherwise, delete the room doc
        if(participants.length > 2) {
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

function initModals() {
    // Show Share modal when share button is clicked
    document.querySelector('#share-id-btn').addEventListener('click', event => {
        document.querySelector('#share-modal').classList.add('active');
    });

    // Show Create Username modal when avatar is clicked
    userAvatar.addEventListener('click', event => {
        usernameModal.classList.add('active');
    });

    // Hide all modals when a close element is clicked 
    document.querySelectorAll('.close-modal').forEach(closeElement => {
        closeElement.addEventListener('click', event => {
            event.preventDefault();

            modalAction = null;

            document.querySelectorAll('.modal').forEach(modal => modal.classList.remove('active'));
        });
    });

    // Create Username modal
    const usernameField = document.querySelector('#username');
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
    hangUpBtn.addEventListener('click', hangUp);
}

function init() {
    // Populate the room id field if it's included in the url
    const searchParams = new URLSearchParams(location.search);
    if(searchParams.has('room')) roomIdInput.value = searchParams.get('room');

    initModals();

    // Show/Hide the stream area if either stream option is enabled
    function adjustUiToStreamOpts() {
        const streamArea = document.querySelector('#stream-area');
        const chatArea = document.querySelector('#chat-area');

        if(audioEnabledCheck.checked || videoEnabledCheck.checked) {
            streamArea.style.display = 'flex';
            chatArea.classList.remove('col-12');
            chatArea.classList.add('col-3');
        }else{
            streamArea.style.display = 'none';
            chatArea.classList.remove('col-3');
            chatArea.classList.add('col-12');
        }
    }

    audioEnabledCheck.addEventListener('change', function(event) {
        adjustUiToStreamOpts();
    });

    //// TODO: Handle video options when enabling video after already connected
    // Enable/Disable video options elements according to the video enabled element
    videoEnabledCheck.addEventListener('change', function(event) {
        adjustUiToStreamOpts();
        videoOptions.forEach(optionEl => optionEl.disabled = !this.checked);
    });

    createRoomBtn.addEventListener('click', event => {
        if(!username) {
            modalAction = 'createRoom';
            usernameModal.classList.add('active');
        }else{
            createRoom();
        }
    });

    joinRoomBtn.addEventListener('click', event => {
        if(!username) {
            modalAction = 'joinRoom';
            usernameModal.classList.add('active');
        }else{
            joinRoom();
        }
    });
}

init();