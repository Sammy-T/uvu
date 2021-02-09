function init() {
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
}

init();