<script>
    import { username } from '$lib/stores';

    let usernameValue;

    function setUsername() {
        $username = usernameValue;
    }
</script>

<form on:submit|preventDefault={setUsername}>
    <label for="username">Username</label>
    <input type="text" name="username" autocomplete="off" bind:value={usernameValue} required>

    <button type="submit">Create</button>
</form>
