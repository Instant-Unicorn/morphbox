<script lang="ts">
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import Claude from '$lib/Claude.svelte';
  import { settings, applyTheme } from '$lib/panels/Settings/settings-store';
  
  // WebSocket URL should use the same hostname as the web interface
  // Port is always webPort + 1 (8008->8009, 8010->8011, etc.)
  let websocketUrl = browser ? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.hostname}:${parseInt(window.location.port) + 1}` : '';
  let claudeComponent: any;
  
  onMount(() => {
    // Apply theme
    applyTheme($settings.theme);
    
    // Focus on Claude terminal when loaded
    setTimeout(() => {
      if (claudeComponent && claudeComponent.focus) {
        claudeComponent.focus();
      }
    }, 100);
  });
</script>

<style>
  .terminal-mode-container {
    width: 100vw;
    height: 100vh;
    background: var(--background);
    color: var(--text);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  
  .terminal-header {
    background: var(--surface);
    border-bottom: 1px solid var(--border);
    padding: 0.5rem 1rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-shrink: 0;
  }
  
  .terminal-title {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--text-secondary);
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  
  .terminal-badge {
    background: var(--primary);
    color: var(--background);
    padding: 0.125rem 0.5rem;
    border-radius: 0.25rem;
    font-size: 0.75rem;
    font-weight: 600;
  }
  
  .terminal-content {
    flex: 1;
    overflow: hidden;
  }
  
  .keyboard-hint {
    font-size: 0.75rem;
    color: var(--text-secondary);
  }
</style>

<div class="terminal-mode-container">
  <div class="terminal-header">
    <div class="terminal-title">
      <span>Morphbox</span>
      <span class="terminal-badge">Terminal Mode</span>
    </div>
    <div class="keyboard-hint">
      Press Ctrl+C to exit
    </div>
  </div>
  
  <div class="terminal-content">
    <Claude 
      bind:this={claudeComponent}
      {websocketUrl}
      panelTitle="Claude Code"
    />
  </div>
</div>