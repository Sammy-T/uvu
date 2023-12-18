<script>
    import logo from '$lib/assets/uvu-logo.svg?raw';

    export let padded = true;
</script>

<nav class:padded>
    <ul>
        <li><a href="/">{@html logo}</a></li>
    </ul>

    <ul>
        <li><a href="/about">about</a></li>
        <li><a href="/chat" role="button">chat</a></li>
    </ul>
</nav>

<style>
    .padded {
        padding: 0 var(--spacing);
    }
</style>
