<script>
    import Video from './media/Video.svelte';
    import { localDisplayStream, localStream, remoteStreams } from '$lib/stores';

    let media = [];

    $: updateMedia([$localStream, $localDisplayStream, $remoteStreams]);

    function updateMedia(placeholder) {
        const m = [];

        if($localStream) m.push({ stream: $localStream });
        if($localDisplayStream) m.push({ stream: $localDisplayStream });

        for(const participant in $remoteStreams) {
            const streams = $remoteStreams[participant];
            m.push(...streams);
        }

        media = m;
    }
</script>

<div id="media-container">
    {#each media as item (item.stream.id)}
        <Video mediaItem={item} />
    {/each}
</div>

<style>
    #media-container {
        display: flex;
        flex-wrap: wrap;
    }
</style>
