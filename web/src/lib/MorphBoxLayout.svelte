<script lang="ts">
  import Terminal from '$lib/Terminal.svelte';
  import { browser } from '$app/environment';
  import { onMount } from 'svelte';
  import { panels, activePanel, panelStore, visiblePanels, type Panel } from '$lib/stores/panels';
  import SplitPane from '$lib/components/SplitPane.svelte';
  import PanelContainer from '$lib/components/PanelContainer.svelte';
  import PanelManager from '$lib/components/PanelManager.svelte';
  import FileExplorer from '$lib/panels/FileExplorer/FileExplorer.svelte';
  import CodeEditor from '$lib/panels/CodeEditor/CodeEditor.svelte';
  import Settings from '$lib/panels/Settings/Settings.svelte';
  import BasePanel from '$lib/panels/BasePanel.svelte';
  import { settings, applyTheme } from '$lib/panels/Settings/settings-store';
  import { fade } from 'svelte/transition';
  
  let terminal: Terminal;
  let mounted = false;
  let showLoadingOverlay = true;
  
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
    'file-explorer': FileExplorer,  // Support both naming conventions
    codeEditor: CodeEditor,
    'code-editor': CodeEditor,      // Support both naming conventions
    settings: Settings
  };
  
  
  // Initialize default panels
  onMount(() => {
    mounted = true;
    console.log('MorphBoxLayout mounted');
    
    // Hide loading overlay after a short delay
    setTimeout(() => {
      showLoadingOverlay = false;
    }, 1500);
    
    // Load settings and apply theme
    settings.load();
    const unsubscribe = settings.subscribe($settings => {
      applyTheme($settings.theme, $settings.customTheme);
    });
    
    // Initialize default panels (without clearing - we'll do that differently)
    panelStore.initializeDefaults();
    
    // Wait a tick for store to update, then check for terminal
    setTimeout(() => {
      const terminalPanels = $panels.filter(p => p.type === 'terminal');
      if (terminalPanels.length > 0) {
        terminalPanel = terminalPanels[0];
      } else {
        // Create terminal if it doesn't exist
        panelStore.addPanel('terminal', { persistent: true });
        // Find it after adding
        setTimeout(() => {
          terminalPanel = $panels.find(p => p.type === 'terminal')!;
        }, 0);
      }
    }, 0);
    
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
      panelStore.setActivePanel(existingEditor.id);
    } else {
      // Create new editor panel
      panelStore.addPanel('codeEditor', {
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
        panelStore.addPanel(panelType, panelData);
        break;
      case 'remove':
        if (panelData?.id) {
          panelStore.removePanel(panelData.id);
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
      panelStore.setActivePanel(settingsPanel.id);
    } else {
      panelStore.addPanel('settings');
    }
  }
</script>

<div class="morphbox-container">
  <!-- Minimal Header with just Panel Manager -->
  <div class="panel-manager-container">
    <PanelManager on:action={handlePanelAction} />
    <!-- Temporary clear button -->
    <button 
      on:click={() => { localStorage.clear(); location.reload(); }} 
      style="position: fixed; top: 50px; right: 10px; padding: 5px 10px; background: #d73a49; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; z-index: 1001;"
    >
      Clear Storage
    </button>
  </div>

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
              {/if}
            {/each}
            
            <!-- Floating panels (non-terminal) -->
            {#each $panels.filter(p => p.type !== 'terminal') as panel (panel.id)}
              {#if panelComponents[panel.type]}
              {#if !panel.minimized}
                <BasePanel
                  config={{
                    title: panel.title,
                    icon: null,
                    movable: true,
                    resizable: true,
                    closable: !panel.persistent,
                    minimizable: true,
                    maximizable: true,
                    minWidth: 300,
                    minHeight: 200
                  }}
                  state={{
                    x: panel.position.x,
                    y: panel.position.y,
                    width: panel.size.width,
                    height: panel.size.height,
                    zIndex: panel.zIndex || 10,
                    isMinimized: panel.minimized || false,
                    isMaximized: panel.maximized || false
                  }}
                  onClose={() => panelStore.removePanel(panel.id)}
                  onMinimize={() => panelStore.updatePanel(panel.id, { minimized: true })}
                  onMaximize={() => panelStore.updatePanel(panel.id, { maximized: true })}
                  onRestore={() => panelStore.updatePanel(panel.id, { maximized: false })}
                  onFocus={() => panelStore.setActivePanel(panel.id)}
                  onMove={(x, y) => panelStore.updatePanel(panel.id, { position: { x, y } })}
                  onResize={(width, height) => panelStore.updatePanel(panel.id, { size: { width, height } })}
                >
                  <svelte:component this={panelComponents[panel.type]} {...panel.content} />
                </BasePanel>
              {/if}
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
          {/if}
        {/each}
        
        <!-- Floating panels (non-terminal) -->
        {#each $panels.filter(p => p.type !== 'terminal') as panel (panel.id)}
          {#if panelComponents[panel.type]}
          {#if !panel.minimized}
            <BasePanel
              config={{
                title: panel.title,
                icon: null,
                movable: true,
                resizable: true,
                closable: !panel.persistent,
                minimizable: true,
                maximizable: true,
                minWidth: 300,
                minHeight: 200
              }}
              state={{
                x: panel.position.x,
                y: panel.position.y,
                width: panel.size.width,
                height: panel.size.height,
                zIndex: panel.zIndex || 10,
                isMinimized: panel.minimized || false,
                isMaximized: panel.maximized || false
              }}
              onClose={() => panelStore.removePanel(panel.id)}
              onMinimize={() => panelStore.updatePanel(panel.id, { minimized: true })}
              onMaximize={() => panelStore.updatePanel(panel.id, { maximized: true })}
              onRestore={() => panelStore.updatePanel(panel.id, { maximized: false })}
              onFocus={() => panelStore.setActivePanel(panel.id)}
              onMove={(x, y) => panelStore.updatePanel(panel.id, { position: { x, y } })}
              onResize={(width, height) => panelStore.updatePanel(panel.id, { size: { width, height } })}
            >
              <svelte:component this={panelComponents[panel.type]} {...panel.content} />
            </BasePanel>
          {/if}
          {/if}
        {/each}
      </div>
    {/if}
  </div>

</div>

<!-- Global loading overlay - rendered outside all containers -->
{#if showLoadingOverlay}
  <div class="global-loading-overlay" transition:fade={{ duration: 400 }}>
    <img src="/splashlogo.png" alt="MorphBox" class="loading-logo" />
  </div>
{/if}

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

  /* Panel Manager Container */
  .panel-manager-container {
    position: fixed;
    top: 10px;
    right: 10px;
    z-index: 1000;
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
    overflow: hidden;
    max-height: 100%;
  }



  /* BasePanel Dark Theme Variables */
  :global(.panel) {
    --panel-bg: #2d2d30;
    --panel-border: #3e3e42;
    --panel-radius: 4px;
    --panel-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
    --panel-shadow-hover: 0 6px 20px rgba(0, 0, 0, 0.5);
    --panel-header-bg: #323233;
    --panel-title-color: #cccccc;
    --panel-control-color: #858585;
    --panel-control-hover-bg: rgba(255, 255, 255, 0.1);
    --panel-control-active-bg: rgba(255, 255, 255, 0.2);
    --panel-close-hover-bg: #f14c4c;
    --panel-resize-color: #858585;
    --panel-content-padding: 0; /* No padding for code/file panels */
    z-index: 100; /* Ensure panels are above terminal */
  }
  
  :global(.panel-content) {
    padding: 0; /* Remove default padding for our panels */
    height: 100%;
    display: flex;
    flex-direction: column;
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
    .panel-manager-container {
      top: 5px;
      right: 5px;
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
  
  /* Global loading overlay - above everything */
  .global-loading-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background-color: #1e1e1e;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2147483647; /* Maximum z-index value */
    pointer-events: all;
  }
  
  .loading-logo {
    width: 100vw;
    height: 100vh;
    object-fit: contain;
    object-position: center;
    opacity: 1;
  }
</style>