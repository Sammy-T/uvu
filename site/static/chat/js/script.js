const roomIdInput = document.querySelector('#room-id-input');

function init() {
    // Populate the room id field if it's included in the url
    const searchParams = new URLSearchParams(location.search);
    if(searchParams.has('room')) roomIdInput.value = searchParams.get('room');

    // Show Share modal when share button is clicked
    document.querySelector('#share-id-btn').addEventListener('click', event => {
        document.querySelector('#share-modal').classList.add('active');
    });

    // Show Create Username modal when avatar is clicked
    document.querySelector('#user-avatar').addEventListener('click', event => {
        document.querySelector('#username-modal').classList.add('active');
    });

    // Hide all modals when a close element is clicked 
    document.querySelectorAll('.close-modal').forEach(closeElement => {
        closeElement.addEventListener('click', event => {
            event.preventDefault();

            document.querySelectorAll('.modal').forEach(modal => modal.classList.remove('active'));
        });
    });

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
}

init();