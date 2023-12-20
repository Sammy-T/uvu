<script>
    import { sendEnabled } from '$lib/stores';
    import { sendMessage } from '$lib/util';
    import Info from './messages/Info.svelte';
    import Message from './messages/Message.svelte';
    import { messages } from '$lib/stores';
    import { localUid } from '$lib/util';

    let msgText;

    function handleSend() {
        sendMessage(msgText);
        msgText = '';
    }
</script>

<div id="chat-area">
    <div id="msg-container">
        <div id="messages">
            {#if $messages.length > 0}
                {#each $messages as message, i (i)}
                    {#if message.type === 'info'}
                        <Info message={message.content} />
                    {:else if message.type === 'message' && message.user === localUid}
                        <Message self={true} user={message.username} message={message.content} />
                    {:else if message.type === 'message'}
                        <Message user={message.username} message={message.content} />
                    {/if}
                {/each}
            {:else}
                <div class="system-msg">
                    <p>No messages</p>
                </div>
            {/if}
        </div>
    </div>

    <textarea placeholder="Message" bind:value={msgText}></textarea>

    <div id="send-area">
        <kbd>Ctrl + Enter</kbd>
        <button on:click={handleSend} disabled={!$sendEnabled}>Send</button>
    </div>
</div>

<style>
    #chat-area {
        min-width: 30vw;
        max-width: 720px;
        height: 75vh;
        padding: var(--spacing);
        display: flex;
        flex-direction: column;
        justify-content: end;
    }

    #msg-container {
        position: relative;
        flex-grow: 1;
    }

    #messages {
        overflow-y: auto;
        margin-bottom: calc(var(--spacing) * 0.75);
        position: absolute;
        top: 0;
        left: 0;
        bottom: 0;
        right: 0;
        padding: 0 calc(var(--spacing) * 0.5);
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
