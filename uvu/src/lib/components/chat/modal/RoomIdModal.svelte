<script>
    import { getContext } from 'svelte';
    import { roomId } from '$lib/stores';
    import { joinRoom } from '$lib/util';

    const showRoomIdModal = getContext('showRoomIdModal');

    let id = new URLSearchParams(window.location.hash.replace('#', '')).get('room');

    async function setRoomId() {
        $roomId = id;

        closeModal();

        try {
            await joinRoom();
        } catch(error) {
            // Already caught and re-thrown in util
        }
    }

    /**
     * @param {Event} event
     */
    function cancel(event) {
        if(event.currentTarget !== event.target) return;

        closeModal();
    }

    function closeModal() {
        $showRoomIdModal = false;
    }
</script>

<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
<!-- svelte-ignore a11y-click-events-have-key-events -->
<dialog open on:click={cancel}>
    <article>
        <form id="roomIdForm" on:submit|preventDefault={setRoomId}>
            <input type="text" name="room" autocomplete="off" placeholder="Room ID" bind:value={id} required>
        </form>

        <footer>
            <button class="secondary" on:click={cancel}>Cancel</button>
            <button type="submit" form="roomIdForm">Join</button>
        </footer>
    </article>
</dialog>

<style>
    footer {
        display: flex;
        justify-content: end;
        gap: var(--spacing);
    }

    footer button {
        width: unset;
    }
</style>
