<script>
    import { createEventDispatcher, onMount } from 'svelte';

    const dispatch = createEventDispatcher();

    export let msg;
    export let duration = -1;

    onMount(() => {
        if(duration > 0) {
            setTimeout(() => {
                dispatch('durationReach');
            }, duration);
        }
    });
</script>

<div class="msg">
    <div class="card">
        <p>{msg}</p>
    </div>
</div>

<style>
    .msg {
        position: absolute;
        bottom: 0;
        right: 0;
        padding: var(--spacing);
    }

    .card {
        background-color: var(--contrast-focus);
        padding: calc(var(--spacing) * 0.5) var(--spacing);
        border-radius: var(--border-radius);
    }

    .card > * {
        margin: 0;
    }
</style>
