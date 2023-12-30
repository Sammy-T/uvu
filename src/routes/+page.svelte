<script>
    import logo from '$lib/assets/uvu-logo.svg?raw';
    import videoIc from '$lib/assets/video-ic.svg?raw';
    import screenIc from '$lib/assets/screen-ic.svg?raw';
    import chatIc from '$lib/assets/chat-ic.svg?raw';
    import Nav from '$lib/components/Nav.svelte';
    import Footer from '$lib/components/Footer.svelte';
</script>

<main id="main-container" class="container-fluid">
    <section class="lead-area">
        <Nav padded={false} />

        <div class="lead">
            <div class="lead-img">{@html logo}</div>
            <p>Peer-to-peer chat &amp; conferencing</p>
            <a href="/chat" role="button">Start chatting</a>
        </div>
    </section>

    <section class="feature-area">
        <h4>Uvu rooms are no sign-up, single-serving sessions featuring..</h4>

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
    #main-container {
        padding: 0;
    }

    section {
        padding: 0 var(--spacing);
        margin: 0;
    }

    .lead-area {
        height: 100vh;
        padding-bottom: calc(var(--block-spacing-vertical));
        overflow-y: auto;
        display: flex;
        flex-direction: column;
    }

    .lead {
        flex-grow: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
    }

    .lead-img {
        flex-grow: 1;
        width: 100%;
        display: flex;
        overflow-y: auto;
        justify-content: center;
    }

    .lead > p {
        text-align: center;
        font-size: calc(var(--font-size) * 1.25);
        color: white;
    }

    .feature-area {
        padding: calc(var(--spacing) * 6) calc(var(--spacing) * 2);
        background-image: linear-gradient(45deg, #009797ff, #092d2dff);
    }

    .feature-area > * {
        text-align: center;
        color: white;
        font-weight: 400;
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
