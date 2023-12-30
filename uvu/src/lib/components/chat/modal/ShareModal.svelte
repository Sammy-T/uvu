<script>
    import InfoToast from '../toasts/InfoToast.svelte';
    import { roomId } from '$lib/stores';
    import { getContext } from 'svelte';

    const showShareModal = getContext('showShareModal');

    let showCopiedToast = false;

    function removeToast() {
        showCopiedToast = false;
    }

    /**
     * @param {Event} event
     */
    function shareAction(event) {
        // @ts-ignore
        const hash = new URL(event.target.href).hash;

        const params = new URLSearchParams();
        params.set('room', $roomId);
        
        const shareUrl = new URL(window.location.href.split('#').at(0));
        shareUrl.hash = params.toString();
        
        const subject = 'Join me on UVU';
        const body = `Join my UVU chat room at\n${shareUrl.href}`;
        
        switch(hash) {
            case '#gmail':
                const gmailLink = `https://mail.google.com/mail/?view=cm&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                window.open(gmailLink);
                break;
            
            case '#share':
                const mailtoLink = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                window.open(mailtoLink);
                break;

            case '#copy_link':
                copy(shareUrl.href);
                break;
            
            case '#copy':
                copy($roomId);
                break;
        }
    }

    /**
     * @param {String} text
     */
    async function copy(text) {
        try {
            await navigator.clipboard.writeText(text);
            showCopiedToast = true;
        } catch(error) {
            console.error('Unable to copy to clipboard', error);
        }
    }

    /**
     * @param {Event} event
     */
     function cancel(event) {
        if(event.currentTarget !== event.target) return;
        
        closeModal();
    }

    function closeModal() {
        $showShareModal = false;
    }
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
<dialog open on:click={cancel}>
    <article>
        <hgroup>
            <h5>Share Room</h5>
            <h6>{$roomId ?? 'No room id'}</h6>
        </hgroup>

        <nav>
            <ul>
                <li><a href="#gmail" on:click|preventDefault={shareAction}>Share with gmail</a></li>
                <li><a href="#share" on:click|preventDefault={shareAction}>Share with default</a></li>
                <li><a href="#copy_link" on:click|preventDefault={shareAction}>Copy link</a></li>
                <li><a href="#copy" on:click|preventDefault={shareAction}>Copy</a></li>
            </ul>
        </nav>
    </article>

    {#if showCopiedToast}
        <InfoToast msg={'Copied'} duration={1000} on:durationReach={removeToast} />
    {/if}
</dialog>

<style>
    article {
        padding: var(--block-spacing-vertical) calc(var(--block-spacing-horizontal) * 2);
    }

    nav {
        justify-content: center;
    }

    ul {
        display: flex;
        flex-direction: column;
    }
</style>
