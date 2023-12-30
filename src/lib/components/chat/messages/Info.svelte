<script>
    import { onMount } from "svelte";

    export let message = "Info";

    let infoComponent;

    onMount(() => {
        infoComponent.scrollIntoView({block: 'end', inline: 'nearest', behavior: 'smooth'});
    });
</script>

<p bind:this={infoComponent}>{message}</p>

<style>
    p {
        text-align: center;
        color: var(--muted-color);
    }
</style>
