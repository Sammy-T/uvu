<script>
    import Video from './media/Video.svelte';
    import { localDisplayStream, localStream, localStreamType, remoteStreams } from '$lib/stores';
    import { writable } from 'svelte/store';
    import { setContext } from 'svelte';

    const mediaStreams = writable([]);
    setContext('media', mediaStreams);

    $: updateMedia([$localStream, $localDisplayStream, $remoteStreams]);

    function updateMedia(placeholder) {
        const m = [];

        if($localStream && $localStreamType === 'video') m.push($localStream);
        if($localDisplayStream) m.push($localDisplayStream);

        const rStreams = $remoteStreams.filter(s => s.getTracks().some(t => t.kind === 'video'));

        m.push(...rStreams);
        console.log('video', m);

        $mediaStreams = m;
    }
</script>

<div id="media-container">
    {#each $mediaStreams as stream (stream.id)}
        <Video mediaItem={stream} />
    {/each}
</div>

<style>
    #media-container {
        display: flex;
        flex-wrap: wrap;
    }
</style>
