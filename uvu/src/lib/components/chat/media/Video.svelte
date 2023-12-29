<script>
    import { getContext, onMount } from 'svelte';

    const media = getContext('media');

    export let mediaItem;

    let video;

    onMount(() => {
        video.srcObject = mediaItem.stream;
    });
</script>

<div class="video-container" class:limit-height={$media.length > 1} class:limit-width={$media.length > 2}>
    <!-- svelte-ignore a11y-media-has-caption -->
    <video controls autoplay muted bind:this={video} />
</div>

<style>
    .video-container {
        width: unset;
        min-width: 50%;
        flex-grow: 1;
        max-height: 100vh;
    }

    .limit-height {
        max-height: 50vh;
    }

    .limit-width {
        max-width: 50%;
    }

    video {
        width: 100%;
        height: 100%;
    }
</style>
