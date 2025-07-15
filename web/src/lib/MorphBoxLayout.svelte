<script lang="ts">
  import Terminal from '$lib/Terminal.svelte';
  import { browser } from '$app/environment';
  import { onMount } from 'svelte';
  import { panels, activePanel, type Panel } from '$lib/stores/panels';
  import SplitPane from '$lib/components/SplitPane.svelte';
  import PanelContainer from '$lib/components/PanelContainer.svelte';
  import PanelManager from '$lib/components/PanelManager.svelte';
  import FileExplorer from '$lib/panels/FileExplorer/FileExplorer.svelte';
  import CodeEditor from '$lib/panels/CodeEditor/CodeEditor.svelte';
  import Settings from '$lib/panels/Settings/Settings.svelte';
  import { settings, applyTheme } from '$lib/panels/Settings/settings-store';
  
  let terminal: Terminal;
  let mounted = false;
  
  // Use the same host as the current page
  $: websocketUrl = browser ? `ws://${window.location.hostname}:8009` : '';
  
  // State for UI
  let isConnected = false;
  let agentStatus = 'No agent';
  let sessionId = '';
  let currentTime = new Date().toLocaleTimeString();
  
  // Panel management
  let showFileExplorer = false;
  let terminalPanel: Panel;
  
  // Dynamic component mapping
  const panelComponents = {
    terminal: Terminal,
    fileExplorer: FileExplorer,
    codeEditor: CodeEditor,
    settings: Settings
  };
  
  // Initialize default panels
  onMount(() => {
    mounted = true;
    console.log('MorphBoxLayout mounted');
    
    // Load settings and apply theme
    settings.load();
    const unsubscribe = settings.subscribe($settings => {
      applyTheme($settings.theme, $settings.customTheme);
    });
    
    // Initialize default panels
    panels.initializeDefaults();
    
    // Get terminal panel reference
    const terminalPanels = $panels.filter(p => p.type === 'terminal');
    if (terminalPanels.length > 0) {
      terminalPanel = terminalPanels[0];
    } else {
      // Create terminal if it doesn't exist
      panels.addPanel('terminal', { persistent: true });
      terminalPanel = $panels.find(p => p.type === 'terminal')!;
    }
    
    const interval = setInterval(() => {
      currentTime = new Date().toLocaleTimeString();
    }, 1000);
    
    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  });
  
  // Handle WebSocket events
  export function onConnectionChange(connected: boolean) {
    isConnected = connected;
  }
  
  export function onAgentChange(status: string) {
    agentStatus = status || 'No agent';
  }
  
  export function onSessionChange(id: string) {
    sessionId = id;
  }
  
  // Handle file open from explorer
  function handleFileOpen(event: CustomEvent) {
    const { file } = event.detail;
    // Check if editor panel exists
    const existingEditor = $panels.find(p => p.type === 'codeEditor');
    if (existingEditor) {
      panels.setActivePanel(existingEditor.id);
    } else {
      // Create new editor panel
      panels.addPanel('codeEditor', {
        title: 'Code Editor',
        content: { file }
      });
    }
  }
  
  // Handle panel actions from PanelManager
  function handlePanelAction(event: CustomEvent) {
    const { action, panelType, panelData } = event.detail;
    
    switch (action) {
      case 'create':
        // Panel creation is handled by the wizard
        break;
      case 'add':
        panels.addPanel(panelType, panelData);
        break;
      case 'remove':
        if (panelData?.id) {
          panels.removePanel(panelData.id);
        }
        break;
    }
  }
  
  // Toggle file explorer
  function toggleFileExplorer() {
    showFileExplorer = !showFileExplorer;
  }
  
  // Open settings panel
  function openSettings() {
    const settingsPanel = $panels.find(p => p.type === 'settings');
    if (settingsPanel) {
      panels.setActivePanel(settingsPanel.id);
    } else {
      panels.addPanel('settings');
    }
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
      <button class="btn btn-sm" on:click={toggleFileExplorer}>
        Files
      </button>
      <PanelManager on:action={handlePanelAction} />
      <button class="btn btn-sm" on:click={openSettings}>
        Settings
      </button>
    </div>
  </header>

  <!-- Main Content Area -->
  <div class="morphbox-main">
    {#if showFileExplorer}
      <SplitPane orientation="horizontal" initialSplit={20} minSize={200} maxSize={400}>
        <div slot="first" class="file-explorer-container">
          <PanelContainer title="Files" closable={true} on:close={() => showFileExplorer = false}>
            <FileExplorer on:fileOpen={handleFileOpen} />
          </PanelContainer>
        </div>
        <div slot="second" class="main-content">
          <!-- Main content area with panels -->
          <div class="panels-container">
            {#each $panels as panel (panel.id)}
              {#if panel.type === 'terminal'}
                <!-- Terminal is always visible in main area -->
                <div class="terminal-wrapper" class:hidden={$activePanel?.id !== panel.id && $panels.filter(p => !p.minimized && p.type !== 'terminal').length > 0}>
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
              {:else if panelComponents[panel.type] && !panel.minimized}
                <!-- Other panels -->
                <div class="panel-wrapper" class:active={$activePanel?.id === panel.id}>
                  <PanelContainer 
                    title={panel.title} 
                    closable={!panel.persistent} 
                    on:close={() => panels.removePanel(panel.id)}
                  >
                    <svelte:component this={panelComponents[panel.type]} {...panel.content} />
                  </PanelContainer>
                </div>
              {/if}
            {/each}
          </div>
        </div>
      </SplitPane>
    {:else}
      <!-- No file explorer, full width content -->
      <div class="panels-container">
        {#each $panels as panel (panel.id)}
          {#if panel.type === 'terminal'}
            <!-- Terminal is always visible -->
            <div class="terminal-wrapper" class:hidden={$activePanel?.id !== panel.id && $panels.filter(p => !p.minimized && p.type !== 'terminal').length > 0}>
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
          {:else if panelComponents[panel.type] && !panel.minimized}
            <!-- Other panels -->
            <div class="panel-wrapper" class:active={$activePanel?.id === panel.id}>
              <PanelContainer 
                title={panel.title} 
                closable={!panel.persistent} 
                on:close={() => panels.removePanel(panel.id)}
              >
                <svelte:component this={panelComponents[panel.type]} {...panel.content} />
              </PanelContainer>
            </div>
          {/if}
        {/each}
      </div>
    {/if}
  </div>

  <!-- Status Bar -->
  <footer class="morphbox-status">
    <div class="status-left">
      <span class="status-item">Agent: {agentStatus}</span>
      {#if sessionId}
        <span class="status-item">Session: {sessionId}</span>
      {/if}
      <span class="status-item">Panels: {$panels.filter(p => !p.minimized).length}</span>
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
    background-color: var(--bg-primary, #1e1e1e);
    color: var(--text-primary, #d4d4d4);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    position: relative;
    overflow: hidden;
  }

  /* Header Styles */
  .morphbox-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 40px;
    padding: 0 16px;
    background-color: var(--bg-secondary, #2d2d30);
    border-bottom: 1px solid var(--border-color, #3e3e42);
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
    color: var(--text-secondary, #cccccc);
  }

  .version {
    font-size: 12px;
    color: var(--text-tertiary, #858585);
  }

  .connection-status {
    font-size: 13px;
    color: var(--text-tertiary, #858585);
  }

  .connection-status.connected {
    color: var(--accent-color, #4ec9b0);
  }

  .btn {
    background-color: var(--button-bg, #3c3c3c);
    color: var(--button-text, #cccccc);
    border: 1px solid var(--border-color, #3e3e42);
    padding: 4px 12px;
    border-radius: 4px;
    font-size: 12px;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .btn:hover {
    background-color: var(--button-hover, #484848);
  }

  /* Main Content Area */
  .morphbox-main {
    display: flex;
    flex: 1;
    overflow: hidden;
  }

  .file-explorer-container {
    height: 100%;
    background-color: var(--bg-secondary, #252526);
  }

  .main-content {
    height: 100%;
    position: relative;
  }

  .panels-container {
    position: relative;
    height: 100%;
    width: 100%;
  }

  .terminal-wrapper {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 1;
  }

  .terminal-wrapper.hidden {
    display: none;
  }

  .panel-wrapper {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 2;
    display: none;
  }

  .panel-wrapper.active {
    display: block;
  }

  /* Status Bar */
  .morphbox-status {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 22px;
    padding: 0 16px;
    background-color: var(--status-bg, #007acc);
    color: var(--status-text, #ffffff);
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
    color: var(--text-primary, #d4d4d4);
    font-family: "Cascadia Code", "Fira Code", monospace;
    font-size: 16px;
  }

  /* Mobile Responsive Styles */
  @media (max-width: 768px) {
    .morphbox-header {
      height: 36px;
      padding: 0 8px;
    }

    .morphbox-header h1 {
      font-size: 14px;
    }

    .version {
      display: none;
    }

    .header-center {
      flex: 1;
      justify-content: center;
    }

    .connection-status {
      font-size: 12px;
    }

    .btn {
      padding: 4px 8px;
      font-size: 11px;
    }

    .morphbox-status {
      height: 20px;
      padding: 0 8px;
      font-size: 11px;
    }

    .status-left, .status-right {
      gap: 8px;
    }

    /* Hide some elements on very small screens */
    @media (max-width: 400px) {
      .status-item:nth-child(2) {
        display: none;
      }
      
      .header-right .btn:not(:first-child) {
        display: none;
      }
    }
  }

  /* Prevent iOS rubber band scrolling */
  @supports (-webkit-touch-callout: none) {
    .morphbox-container {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
    }
  }
</style>