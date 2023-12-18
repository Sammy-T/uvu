<script>
    import logo from '$lib/assets/uvu-logo.svg?raw';
</script>

<nav>
    <ul>
        <li><a href="/">{@html logo}</a></li>
    </ul>

    <ul>
        <li><a href="/about">about</a></li>
        <li><a href="##" role="button">chat</a></li>
    </ul>
</nav>

<style>
    nav {
        padding: 0 var(--spacing);
    }
</style>
