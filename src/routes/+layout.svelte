<script>
    import '../app.scss';
    import { dev } from '$app/environment';
    import Analytics from '$lib/components/Analytics.svelte';
</script>

{#if !dev}
    <Analytics />
{/if}

<slot></slot>
