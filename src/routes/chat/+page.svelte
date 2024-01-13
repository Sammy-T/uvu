<script>
    import logo from '$lib/assets/uvu-logo.svg?raw';
    import ChatActions from '$lib/components/chat/ChatActions.svelte';
    import UsernameInput from '$lib/components/chat/UsernameInput.svelte';
    import TextChat from '$lib/components/chat/TextChat.svelte';
    import MediaSection from '$lib/components/chat/MediaSection.svelte';
    import AudioSection from '$lib/components/chat/AudioSection.svelte';
    import { localDisplayStream, localStream, remoteStreams, roomId, username } from '$lib/stores';

    $: updateHash([$roomId]);

    function updateHash(placeholder) {
        if(!$roomId) return;

        const params = new URLSearchParams(window.location.hash.replace('#', ''));
        params.set('room', $roomId);

        window.location.hash = params.toString();
    }
</script>

<nav>
    <ul>
        <li class="brand"><a href="/">{@html logo}</a></li>
    </ul>

    <ChatActions />

    <div></div>
</nav>

<main id="chat-container" class="container-fluid">
    <div id="main-container">
        {#if $localStream || $localDisplayStream || $remoteStreams.length > 0}
            <MediaSection />
        {/if}

        {#if !$username}
            <UsernameInput />
        {:else}
            <TextChat />
        {/if}
    </div>

    <AudioSection />
</main>

<style>
    nav {
        position: absolute;
        z-index: 1;
        width: 100%;
        padding: 0 var(--spacing);
        align-items: center;
    }

    #chat-container {
        min-height: 100vh;
        padding: 0;
        display: flex;
        flex-direction: column;
    }

    #main-container {
        flex-grow: 1;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
    }

    @media (min-width: 720px) {
        nav {
            flex-wrap: wrap;
        }
        
        #main-container {
            flex-direction: row;
        }
    }
</style>
