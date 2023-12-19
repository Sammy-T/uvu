<script>
    export let self = false;
    export let user = "User";
    export let message = "Message";
</script>

<div class:self>
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
    }
</style>
