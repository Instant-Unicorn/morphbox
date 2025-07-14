<script lang="ts">
  import Terminal from '$lib/Terminal.svelte';
  import { browser } from '$app/environment';
  import { onMount } from 'svelte';
  
  let terminal: Terminal;
  
  // Use the same host as the current page
  $: websocketUrl = browser ? `ws://${window.location.hostname}:8009` : '';
  
  // State for UI
  let isConnected = false;
  let agentStatus = 'No agent';
  let sessionId = '';
  let currentTime = new Date().toLocaleTimeString();
  
  // Update time every second
  onMount(() => {
    const interval = setInterval(() => {
      currentTime = new Date().toLocaleTimeString();
    }, 1000);
    
    return () => clearInterval(interval);
  });
  
  // Handle WebSocket events (to be implemented)
  export function onConnectionChange(connected: boolean) {
    isConnected = connected;
  }
  
  export function onAgentChange(status: string) {
    agentStatus = status || 'No agent';
  }
  
  export function onSessionChange(id: string) {
    sessionId = id;
  }
</script>

<div class="morphbox-container">
  <!-- Header/Toolbar -->
  <header class="morphbox-header">
    <div class="header-left">
      <h1>MorphBox</h1>
      <span class="version">v2.0</span>
    </div>
    <div class="header-center">
      <span class="connection-status" class:connected={isConnected}>
        {isConnected ? '● Connected' : '○ Disconnected'}
      </span>
    </div>
    <div class="header-right">
      <button class="btn btn-sm">Settings</button>
    </div>
  </header>

  <!-- Main Content Area -->
  <div class="morphbox-main">
    <!-- Sidebar (future feature) -->
    <!-- <aside class="morphbox-sidebar">
      <h3>Files</h3>
    </aside> -->
    
    <!-- Terminal Container -->
    <div class="terminal-wrapper">
      {#if browser}
        <Terminal 
          bind:this={terminal} 
          {websocketUrl}
          on:connection={(e) => isConnected = e.detail.connected}
          on:agent={(e) => agentStatus = e.detail.status}
          on:session={(e) => sessionId = e.detail.sessionId}
        />
      {:else}
        <div class="loading">Loading terminal...</div>
      {/if}
    </div>
  </div>

  <!-- Status Bar -->
  <footer class="morphbox-status">
    <div class="status-left">
      <span class="status-item">Agent: {agentStatus}</span>
      {#if sessionId}
        <span class="status-item">Session: {sessionId}</span>
      {/if}
    </div>
    <div class="status-right">
      <span class="status-item">{currentTime}</span>
    </div>
  </footer>
</div>

<style>
  .morphbox-container {
    display: flex;
    flex-direction: column;
    height: 100vh;
    width: 100vw;
    background-color: #1e1e1e;
    color: #d4d4d4;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  /* Header Styles */
  .morphbox-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 40px;
    padding: 0 16px;
    background-color: #2d2d30;
    border-bottom: 1px solid #3e3e42;
    flex-shrink: 0;
  }

  .header-left, .header-center, .header-right {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .morphbox-header h1 {
    font-size: 16px;
    font-weight: 600;
    margin: 0;
    color: #cccccc;
  }

  .version {
    font-size: 12px;
    color: #858585;
  }

  .connection-status {
    font-size: 13px;
    color: #858585;
  }

  .connection-status.connected {
    color: #4ec9b0;
  }

  .btn {
    background-color: #3c3c3c;
    color: #cccccc;
    border: 1px solid #3e3e42;
    padding: 4px 12px;
    border-radius: 4px;
    font-size: 12px;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .btn:hover {
    background-color: #484848;
  }

  /* Main Content Area */
  .morphbox-main {
    display: flex;
    flex: 1;
    overflow: hidden;
  }

  /* Sidebar styles - uncomment when implementing
  .morphbox-sidebar {
    width: 240px;
    background-color: #252526;
    border-right: 1px solid #3e3e42;
    padding: 16px;
    overflow-y: auto;
  } */

  .terminal-wrapper {
    flex: 1;
    position: relative;
    overflow: hidden;
  }

  /* Status Bar */
  .morphbox-status {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 22px;
    padding: 0 16px;
    background-color: #007acc;
    color: #ffffff;
    font-size: 12px;
    flex-shrink: 0;
  }

  .status-left, .status-right {
    display: flex;
    gap: 16px;
  }

  .status-item {
    display: flex;
    align-items: center;
  }

  /* Loading State */
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