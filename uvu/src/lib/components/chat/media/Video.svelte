<script>
    import { onMount } from 'svelte';

    export let mediaItem;

    let video;

    onMount(() => {
        video.srcObject = mediaItem.stream;
    });
</script>

<div class="video-container">
    <!-- svelte-ignore a11y-media-has-caption -->
    <video controls autoplay muted bind:this={video} />
</div>

<style>
    .video-container {
        width: unset;
        min-width: 50%;
        flex-grow: 1;
    }

    video {
        width: 100%;
        height: 100%;
    }
</style>
