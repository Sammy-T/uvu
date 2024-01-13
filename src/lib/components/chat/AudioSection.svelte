<script>
    import Audio from '$lib/components/chat/media/Audio.svelte';
</script>

<div id="audio-container">
    <!-- <Audio /> -->
</div>

<style>
    #audio-container {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: calc(var(--spacing) * 0.5);
    }

    @media (min-width: 720px) {
        #audio-container {
            flex-wrap: nowrap;
        }
    }
</style>
