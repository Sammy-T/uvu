<script>
    import mic from '$lib/assets/mic.svg?raw';
    import micOff from '$lib/assets/mic-off.svg?raw';
    import video from '$lib/assets/video.svg?raw';
    import videoOff from '$lib/assets/video-off.svg?raw';
    import monitor from '$lib/assets/monitor.svg?raw';
    import monitorOff from '$lib/assets/monitor-off.svg?raw';
    import more from '$lib/assets/more-vertical.svg?raw';
</script>

<nav>
    <ul>
        <li><a href="##">Create</a></li>
        <li><a href="##">Join</a></li>
    </ul>

    <ul>
        <li><a href="##">{@html micOff}</a></li>
        <li><a href="##">{@html videoOff}</a></li>
        <li><a href="##">{@html monitorOff}</a></li>
        <li><a href="##">{@html more}</a></li>
    </ul>
</nav>

<style>
    nav {
        min-width: 30vw;
        padding: 0 var(--spacing);
        flex-wrap: wrap;
        border-radius: calc(var(--border-radius) * 4);
        background-color: rgba(255, 255, 255, 0.175);
    }
</style>
