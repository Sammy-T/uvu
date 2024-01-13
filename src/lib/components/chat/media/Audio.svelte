<script>
    import { onMount } from 'svelte';

    export let mediaItem;

    let audio;

    onMount(() => {
        audio.srcObject = mediaItem;
    });
</script>

<div class="audio-container">
    <p><small>username</small></p>
    <audio controls autoplay muted bind:this={audio} />
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
