<script>
    import logo from '$lib/assets/uvu-logo.svg?raw';
    import videoIc from '$lib/assets/video-ic.svg?raw';
    import screenIc from '$lib/assets/screen-ic.svg?raw';
    import chatIc from '$lib/assets/chat-ic.svg?raw';
    import Footer from '$lib/components/Footer.svelte';
</script>

<main id="main-content" class="container-fluid">
    <section class="lead-area">
        <nav>
            <ul>
                <li><a href="/">{@html logo}</a></li>
            </ul>

            <ul>
                <li><a href="##">about</a></li>
                <li><a href="##" role="button">chat</a></li>
            </ul>
        </nav>

        <div class="lead">
            {@html logo}
            <p>Peer-to-peer chat &amp; conferencing</p>
            <a href="##" role="button">Start chatting</a>
        </div>
    </section>

    <section class="feature-area">
        <h6>Uvu rooms are no sign-up, single-serving sessions featuring..</h6>

        <table>
            <tr>
                <td>{@html videoIc}</td>
                <td>Video and audio conferencing</td>
            </tr>
            <tr>
                <td>{@html screenIc}</td>
                <td>Screen sharing</td>
            </tr>
            <tr>
                <td>{@html chatIc}</td>
                <td>Text chat</td>
            </tr>
        </table>
    </section>
</main>

<Footer />

<style>
    #main-content {
        padding: 0;
    }

    section {
        padding: 0 1rem;
        margin: 0;
    }

    nav [role="button"] {
        padding: calc(var(--nav-link-spacing-vertical) * 0.5) calc(var(--nav-link-spacing-horizontal) * 2);
    }

    .lead-area {
        min-height: 100vh;
        padding-bottom: 1rem;
        background-image: linear-gradient(45deg, #004a5cff, #04121cff);
    }

    .lead {
        display: flex;
        flex-direction: column;
        align-items: center;
    }

    .lead > p {
        text-align: center;
        font-size: calc(var(--font-size) * 1.25);
        color: white;
    }

    .feature-area {
        padding: 4rem 2rem;
        background-image: linear-gradient(45deg, #009797ff, #092d2dff);
    }

    .feature-area > * {
        text-align: center;
        color: white;
    }

    table {
        width: unset;
        margin: 0;
        margin-left: auto;
        margin-right: auto;
    }

    td {
        border-bottom: unset;
    }
</style>
