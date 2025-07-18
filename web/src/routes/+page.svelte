<script lang="ts">
	import { page } from '$app/stores';
	import RowLayout from '$lib/RowLayout.svelte';
	import TerminalModeLayout from '$lib/TerminalModeLayout.svelte';
	
	$: terminalMode = $page.data?.terminalMode || false;
</script>

{#if terminalMode}
	<TerminalModeLayout />
{:else}
	<RowLayout />
{/if}