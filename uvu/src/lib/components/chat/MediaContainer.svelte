<script>
    import Video from './media/Video.svelte';
    import { localDisplayStream, localStream, remoteStreams } from '$lib/stores';
    import { writable } from 'svelte/store';
    import { setContext } from 'svelte';

    const media = writable([]);
    setContext('media', media);

    $: updateMedia([$localStream, $localDisplayStream, $remoteStreams]);

    function updateMedia(placeholder) {
        const m = [];

        if($localStream) m.push($localStream);
        if($localDisplayStream) m.push($localDisplayStream);

        m.push(...$remoteStreams);
        console.log('media', m);

        $media = m;
    }
</script>

<div id="media-container">
    {#each $media as stream (stream.id)}
        <Video mediaItem={stream} />
    {/each}
</div>

<style>
    #media-container {
        display: flex;
        flex-wrap: wrap;
    }
</style>
