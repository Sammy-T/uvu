const db = firebase.firestore();

let roomRef = null;
let connectionsRef = null;

let localUid = null;
let username = null;

let modalAction = null;

const roomIdInput = document.querySelector('#room-id-input');
const createRoomBtn = document.querySelector('#create-room');
const joinRoomBtn = document.querySelector('#join-room');
const hangUpBtn = document.querySelector('#hang-up');
const usernameModal = document.querySelector('#username-modal');

async function createRoom() {
    roomRef = db.collection('pearmo-rooms').doc();
    connectionsRef = roomRef.collection('connections');

    roomIdInput.value = roomRef.id;
}

function initModals() {
    // Show Share modal when share button is clicked
    document.querySelector('#share-id-btn').addEventListener('click', event => {
        document.querySelector('#share-modal').classList.add('active');
    });

    // Show Create Username modal when avatar is clicked
    document.querySelector('#user-avatar').addEventListener('click', event => {
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
    const createUsernameBtn = document.querySelector('#create-username');

    const usernameExp = /^\w+$/; // Match single word alpha-numeric characters including underscores

    // Set the username and close the modal
    function createUsername() {
        username = document.querySelector('#username').value;

        usernameModal.classList.remove('active');
        
        // If the modal was triggered by another action,
        // continue with that action
        switch(modalAction){
            case 'createRoom':
                createRoom();
                break;
        }

        modalAction = null;
    }

    // Validate the username input and display the validation state
    usernameField.addEventListener('input', function(event) {
        const isValidLength = this.value.length > 5;
        const isValidUsername = usernameExp.test(this.value);

        this.classList.remove('is-success', 'is-error'); // Remove previous validation state

        // Display input validation if the length requirement has been met
        if(isValidLength) {
            const validationClass = isValidUsername ? 'is-success' : 'is-error';
            this.classList.add(validationClass);
        }

        createUsernameBtn.disabled = !(isValidLength && isValidUsername);
    });

    usernameField.addEventListener('keypress', function(event) {
        if(event.key === 'Enter' && !createUsernameBtn.disabled) createUsername();
    });

    createUsernameBtn.addEventListener('click', createUsername);
}

function init() {
    // Populate the room id field if it's included in the url
    const searchParams = new URLSearchParams(location.search);
    if(searchParams.has('room')) roomIdInput.value = searchParams.get('room');

    initModals();

    const audioEnabledCheck = document.querySelector('#audio-enabled');
    const videoEnabledCheck = document.querySelector('#video-enabled');

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

    // Enable/Disable video options elements according to the video enabled element
    videoEnabledCheck.addEventListener('change', function(event) {
        adjustUiToStreamOpts();
        document.querySelectorAll('.video-option').forEach(optionEl => optionEl.disabled = !this.checked);
    });

    createRoomBtn.addEventListener('click', event => {
        if(!username) {
            modalAction = 'createRoom';
            usernameModal.classList.add('active');
        }else{
            createRoom();
        }
    });
}

init();