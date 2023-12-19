<script>
    import logo from '$lib/assets/uvu-logo.svg?raw';
    import ChatActions from '$lib/components/chat/ChatActions.svelte';
    import TextChat from '$lib/components/chat/TextChat.svelte';
</script>

<nav>
    <ul>
        <li class="brand"><a href="/">{@html logo}</a></li>
    </ul>

    <ChatActions />

    <div></div>
</nav>

<main id="main-container" class="container-fluid">
    <!-- <div>
        <h2>Media</h2>
    </div> -->

    <TextChat />
</main>

<style>
    nav {
        position: absolute;
        z-index: 1;
        width: 100%;
        padding: 0 var(--spacing);
        align-items: center;
        flex-wrap: wrap;
    }

    #main-container {
        min-height: 100vh;
        padding: 0;
        display: flex;
        justify-content: center;
        align-items: center;
    }
</style>
