<script>
    import { username, localStream, remoteStreamInfos } from '$lib/stores';
    import { onMount } from 'svelte';

    export let mediaItem;

    let user;
    let audio;

    onMount(() => {
        audio.srcObject = mediaItem;

        if(mediaItem.id === $localStream?.id) {
            user = $username;
        } else {
            const info = $remoteStreamInfos.find(s => s.streamId === mediaItem.id);
            user = info?.username ?? '';
        }
    });
</script>

<div class="audio-container">
    <p><small>{user}</small></p>
    <audio controls autoplay muted bind:this={audio}></audio>
</div>

<style>
    .audio-container {
        width: auto;
        flex-shrink: 1;
    }

    .audio-container > * {
        margin: 0;
    }

    p {
        text-align: center;
    }

    audio {
        max-width: 100%;
    }
</style>
