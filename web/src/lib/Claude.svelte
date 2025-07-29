<script lang="ts">
  import Terminal from './Terminal.svelte';
  
  export let websocketUrl = 'ws://localhost:3000';
  export let panelId: string = '';
  // Accept autoLaunchClaude prop for external reference (always true for Claude)
  export const autoLaunchClaude: boolean = true;
  
  // Pass through any other props
  export let terminalSessionId: string | null = null;
</script>

<Terminal 
  {websocketUrl} 
  {panelId}
  autoLaunchClaude={true}
  bind:terminalSessionId
/>