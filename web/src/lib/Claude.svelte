<script lang="ts">
  import Terminal from './Terminal.svelte';

  export let websocketUrl = 'ws://localhost:3000';
  export let panelId: string = '';
  // Accept autoLaunchClaude prop for external reference (always true for Claude)
  export const autoLaunchClaude: boolean = true;

  // Pass through any other props
  export let terminalSessionId: string | null = null;
  export let backgroundColor: string | undefined = undefined;
  export let textColor: string | undefined = undefined;
  export let boldTextColor: string | undefined = undefined;
</script>

<Terminal
  {websocketUrl}
  {panelId}
  autoLaunchClaude={true}
  bind:terminalSessionId
  {backgroundColor}
  {textColor}
  {boldTextColor}
  on:claude-idle
  on:ready
  on:agent
/>