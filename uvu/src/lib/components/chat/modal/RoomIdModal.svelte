<script>
    import { getContext } from 'svelte';
    import { roomId } from '$lib/stores';
    import { joinRoom } from '$lib/util';

    const showRoomIdModal = getContext('showRoomIdModal');

    let id = $roomId;

    async function setRoomId() {
        $roomId = id;

        closeModal();

        try {
            await joinRoom();
        } catch(error) {
            // Already caught and re-thrown in util
        }
    }

    function closeModal() {
        $showRoomIdModal = false;
    }
</script>

<dialog open>
    <article>
        <form id="roomIdForm" on:submit|preventDefault={setRoomId}>
            <input type="text" name="room" autocomplete="off" placeholder="Room ID" bind:value={id} required>
        </form>

        <footer>
            <button class="secondary" on:click={closeModal}>Cancel</button>
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
