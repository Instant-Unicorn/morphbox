<script lang="ts">
  import Terminal from './Terminal.svelte';
  
  export let websocketUrl = 'ws://localhost:3000';
  export let panelId: string = '';
  export let autoLaunchClaude: boolean = true; // Accept this prop even though it's always true for Claude
  
  // Pass through any other props
  export let terminalSessionId: string | null = null;
</script>

<Terminal 
  {websocketUrl} 
  {panelId}
  autoLaunchClaude={true}
  bind:terminalSessionId
/>