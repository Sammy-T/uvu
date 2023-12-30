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
    import RoomIdModal from './modal/RoomIdModal.svelte';
    import ShareModal from './modal/ShareModal.svelte';
    import { inRoom, localDisplayStream, localStream, screenShareEnabled, streamConstraints, username } from '$lib/stores';
    import { createRoom, exitRoom, refreshStream, startDisplayStream, startStream, stopStream } from '$lib/util';
    import { writable } from 'svelte/store';
    import { setContext } from 'svelte';

    const showRoomIdModal = writable(false);
    setContext('showRoomIdModal', showRoomIdModal);

    const showShareModal = writable(false);
    setContext('showShareModal', showShareModal);

    async function toggleAudio() {
        const constraints = $streamConstraints;
        constraints.audio = !constraints.audio;

        $streamConstraints = constraints;

        if($streamConstraints.video) {
            await refreshStream();
        } else if($streamConstraints.audio) {
            await startStream();
        } else {
            stopStream(localStream);
        }
    }

    async function toggleVideo() {
        const constraints = $streamConstraints;
        constraints.video = !constraints.video;

        $streamConstraints = constraints;

        if($streamConstraints.audio) {
            await refreshStream();
        } else if($streamConstraints.video) {
            await startStream();
        } else {
            stopStream(localStream);
        }
    }

    async function toggleScreenShare() {
        $screenShareEnabled = !$screenShareEnabled;

        if($screenShareEnabled) {
            await startDisplayStream();
        } else {
            stopStream(localDisplayStream);
        }
    }

    async function handleCreate() {
        if(!$username) return;

        try {
            await createRoom();
        } catch(error) {
            // Already caught and re-thrown in util
        }
    }

    function handleShowRoomIdModal() {
        if(!$username) return;
        
        $showRoomIdModal = true;
    }

    function handleShowShareModal() {
        $showShareModal = true;
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
        {#if !$inRoom}
            <li>{@html phone}</li>
            <li><a href="#create" on:click|preventDefault={handleCreate}>Create</a></li>
            <li><a href="#join" on:click|preventDefault={handleShowRoomIdModal}>Join</a></li>
        {:else}
            <li><a href="#share" data-tooltip="Share Room" data-placement="bottom" 
                on:click|preventDefault={handleShowShareModal}>{@html phoneShare}</a></li>
            <li><a href="#hangup" data-tooltip="Hang up" data-placement="bottom" 
                on:click|preventDefault={handleHangUp}>{@html phoneHangUp}</a></li>
        {/if}
    </ul>

    <ul>
        <li>
            <a href="#mic" on:click|preventDefault={toggleAudio}>
                {#if $streamConstraints.audio}
                    {@html mic}
                {:else}
                    {@html micOff}
                {/if}
            </a>
        </li>
        <li>
            <a href="#video" on:click|preventDefault={toggleVideo}>
                {#if $streamConstraints.video}
                    {@html video}
                {:else}
                    {@html videoOff}
                {/if}
            </a>
        </li>
        <li>
            <a href="#screenshare" on:click|preventDefault={toggleScreenShare}>
                {#if $screenShareEnabled}
                    {@html monitor}
                {:else}
                    {@html monitorOff}
                {/if}
            </a>
        </li>
        <li><a href="#options">{@html more}</a></li>
    </ul>
</nav>

{#if $showRoomIdModal}
    <RoomIdModal />
{/if}

{#if $showShareModal}
    <ShareModal />
{/if}

<style>
    nav {
        min-width: 30vw;
        padding: 0 var(--spacing);
        flex-wrap: wrap;
        border-radius: calc(var(--border-radius) * 4);
        background-color: rgba(255, 255, 255, 0.175);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);

    }

    nav li {
        padding: calc(var(--nav-element-spacing-vertical) * 0.5) var(--nav-element-spacing-horizontal);
    }

    [href="#share"] {
        color: mediumseagreen;
    }

    [href="#hangup"] {
        color: tomato;
    }
</style>
