<script lang="ts">
  import Terminal from './Terminal.svelte';
  
  export let websocketUrl = 'ws://localhost:3000';
  
  // Pass through any other props
  export let terminalSessionId: string | null = null;
</script>

<Terminal 
  {websocketUrl} 
  autoLaunchClaude={true}
  bind:terminalSessionId
/>