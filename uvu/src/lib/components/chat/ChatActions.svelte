<script>
    import phone from '$lib/assets/phone.svg?raw';
    import phoneShare from '$lib/assets/phone-share.svg?raw';
    import phoneHangUp from '$lib/assets/phone-hang-up.svg?raw';
    import mic from '$lib/assets/mic.svg?raw';
    import micOff from '$lib/assets/mic-off.svg?raw';
    import video from '$lib/assets/video.svg?raw';
    import videoOff from '$lib/assets/video-off.svg?raw';
    import monitor from '$lib/assets/monitor.svg?raw';
    import monitorOff from '$lib/assets/monitor-off.svg?raw';
    import more from '$lib/assets/more-vertical.svg?raw';
    import { roomId } from '$lib/stores';
    import { createRoom, exitRoom } from '$lib/util';

    async function handleCreate() {
        try {
            await createRoom();
        } catch(error) {
            // Already caught and re-thrown in util
        }
    }

    async function handleHangUp() {
        try {
            await exitRoom();
        } catch(error) {
            // Already caught and re-thrown in util
        }
    }
</script>

<nav>
    <ul>
        {#if !$roomId}
            <li>{@html phone}</li>
            <li><a href="#Create" on:click|preventDefault={handleCreate}>Create</a></li>
            <li><a href="#Join">Join</a></li>
        {:else}
            <li><a href="#Share">{@html phoneShare}</a></li>
            <li><a href="#Hangup" on:click|preventDefault={handleHangUp}>{@html phoneHangUp}</a></li>
        {/if}
    </ul>

    <ul>
        <li><a href="##">{@html micOff}</a></li>
        <li><a href="##">{@html videoOff}</a></li>
        <li><a href="##">{@html monitorOff}</a></li>
        <li><a href="##">{@html more}</a></li>
    </ul>
</nav>

<style>
    nav {
        min-width: 30vw;
        padding: 0 var(--spacing);
        flex-wrap: wrap;
        border-radius: calc(var(--border-radius) * 4);
        background-color: rgba(255, 255, 255, 0.175);
    }

    nav li {
        padding: calc(var(--nav-element-spacing-vertical) * 0.5) var(--nav-element-spacing-horizontal);
    }
</style>
