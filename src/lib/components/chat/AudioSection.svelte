<script>
    import Audio from '$lib/components/chat/media/Audio.svelte';
    import { localStream, localStreamType, remoteStreams } from '$lib/stores';
    import { writable } from 'svelte/store';
    import { setContext } from 'svelte';

    const audioStreams = writable([]);
    setContext('audio', audioStreams);

    $: updateMedia([$localStream, $remoteStreams]);

    function updateMedia(placeholder) {
        const m = [];

        if($localStream && $localStreamType === 'audio') m.push($localStream);

        const rStreams = $remoteStreams.filter(s => s.getTracks().some(t => t.kind === 'audio'));

        m.push(...rStreams);
        console.log('audio', m);

        $audioStreams = m;
    }
</script>

<div id="audio-container">
    {#each $audioStreams as stream (stream.id)}
        <Audio mediaItem={stream} />
    {/each}
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
