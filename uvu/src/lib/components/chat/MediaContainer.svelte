<script>
    import Video from './media/Video.svelte';
</script>

<div id="media-container">
    {#each Array(1) as _, index (index)}
        <Video />
    {/each}
</div>

<style>
    #media-container {
        display: flex;
        flex-wrap: wrap;
    }
</style>
