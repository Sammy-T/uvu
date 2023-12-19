<script>
    import Info from './messages/Info.svelte';
    import Message from './messages/Message.svelte';
</script>

<div id="chat-area">
    <div id="messages">
        <div class="system-msg">
            <p>No messages</p>
        </div>
    </div>

    <textarea placeholder="Message"></textarea>

    <div id="send-area">
        <kbd>Ctrl + Enter</kbd>
        <button disabled>Send</button>
    </div>
</div>

<style>
    #chat-area {
        max-width: 720px;
        height: 75vh;
        padding: var(--spacing);
        display: flex;
        flex-direction: column;
        justify-content: end;
    }

    #messages {
        flex-grow: 1;
        overflow-y: auto;
        margin-bottom: calc(var(--spacing) * 0.75);
        display: flex;
        flex-direction: column;
        justify-content: end;
    }

    #messages * {
        margin: 0;
    }

    .system-msg {
        width: 100%;
        height: 100%;
        text-align: center;
        display: flex;
        flex-direction: column;
        justify-content: center;
    }

    textarea {
        height: 4rem;
        margin-bottom: calc(var(--spacing) * 0.5);
    }

    #send-area {
        display: flex;
        justify-content: end;
        align-items: center;
        gap: calc(var(--spacing) * 0.75);
    }

    #send-area kbd {
        opacity: 0.6;
        font-size: calc(var(--font-size) * 0.5);
    }

    #send-area button {
        width: unset;
        margin: 0;
        padding: calc(var(--spacing) * 0.5) calc(var(--spacing) * 1.25);
        font-size: calc(var(--font-size) * 0.75);
    }
</style>
