<script>
    import { onMount } from "svelte";

    export let self = false;
    export let user = "User";
    export let message = "Message";

    let msgComponent;

    onMount(() => {
        msgComponent.scrollIntoView({block: 'end', inline: 'nearest', behavior: 'smooth'});
    });
</script>

<div class:self bind:this={msgComponent}>
    <small>{user}</small>
    <p>{message}</p>
</div>

<style>
    div {
        display: flex;
        flex-direction: column;
    }

    .self {
        align-items: end;
    }

    small {
        color: var(--primary);
    }

    p {
        max-width: 75%;
        white-space: pre-wrap;
    }
</style>
