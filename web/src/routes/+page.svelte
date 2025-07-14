<script lang="ts">
	import { browser } from '$app/environment';
	import Terminal from '$lib/Terminal.svelte';
	
	let terminal: Terminal;
</script>

<div class="terminal-container">
	{#if browser}
		<Terminal bind:this={terminal} websocketUrl="ws://localhost:8009" />
	{:else}
		<div class="loading">Loading terminal...</div>
	{/if}
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
	
	.loading {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 100%;
		color: #d4d4d4;
		font-family: "Cascadia Code", "Fira Code", monospace;
		font-size: 16px;
	}
</style>