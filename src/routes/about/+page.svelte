<script>
    import Nav from '$lib/components/Nav.svelte';
    import Footer from '$lib/components/Footer.svelte';
</script>

<div class="page-container">
    <main class="container-fluid">
        <Nav />

        <div class="page-content">
            <section>
                <h2>About</h2>
                <p>Uvu establishes peer-to-peer communication via WebRTC (Web Real-Time Communication) with Firebase servers for signaling.</p>
            </section>
    
            <section>
                <h2>Data &amp; Privacy</h2>
                <p>Connection information is temporarily stored on Uvu's servers to establish and manage peer connections between participants. This information is deleted when participants end the call.</p>
                
                <p>Message and media stream contents are transferred through the peer connections and do not pass through Uvu's servers.</p>
                    
                <p>Uvu uses Umami for website analytics. You can view information about Umami by visiting the following link:</p>
    
                <ul>
                    <li><a href="https://umami.is/docs/faq" target="_blank">Umami</a></li>
                </ul>
            </section>
        </div>
    </main>
    
    <Footer />
</div>

<style>
    .page-container {
        min-height: 100vh;
        display: flex;
        flex-direction: column;
    }

    .page-container > main {
        flex-grow: 1;
    }

    main {
        padding: 0;
    }

    .page-content {
        padding: var(--spacing);
    }
</style>
