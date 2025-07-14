<script lang="ts">
	import Terminal from '$lib/Terminal.svelte';
	
	let terminal: Terminal;
</script>

<div class="terminal-container">
	<Terminal bind:this={terminal} websocketUrl="ws://localhost:8009" />
</div>

<style>
	.terminal-container {
		height: 100vh;
		width: 100vw;
		margin: 0;
		padding: 0;
		overflow: hidden;
		background-color: #1e1e1e;
	}
</style>