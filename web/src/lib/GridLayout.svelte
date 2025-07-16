<script lang="ts">
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import { panels, panelStore, type Panel } from '$lib/stores/panels';
  import Terminal from '$lib/Terminal.svelte';
  import FileExplorer from '$lib/panels/FileExplorer/FileExplorer.svelte';
  import CodeEditor from '$lib/panels/CodeEditor/CodeEditor.svelte';
  import Settings from '$lib/panels/Settings/Settings.svelte';
  import GridPanel from '$lib/components/GridPanel.svelte';
  import PanelManager from '$lib/components/PanelManager.svelte';
  import { settings, applyTheme } from '$lib/panels/Settings/settings-store';
  import { fade } from 'svelte/transition';
  
  // Dynamic component mapping
  const panelComponents = {
    terminal: Terminal,
    fileExplorer: FileExplorer,
    'file-explorer': FileExplorer,
    codeEditor: CodeEditor,
    'code-editor': CodeEditor,
    settings: Settings
  };
  
  let showLoadingOverlay = true;
  let websocketUrl = browser ? `ws://${window.location.hostname}:8009` : '';
  let gridContainer: HTMLElement;
  
  // Grid layout state
  let gridPanels: Panel[] = [];
  let gridColumns = 1;
  let gridRows = 1;
  
  interface GridCell {
    row: number;
    col: number;
    panel?: Panel;
  }
  
  // Initialize on mount
  onMount(() => {
    console.log('GridLayout mounted');
    
    // Hide loading overlay
    setTimeout(() => {
      showLoadingOverlay = false;
    }, 1500);
    
    // Load settings and apply theme
    settings.load();
    const unsubscribe = settings.subscribe($settings => {
      applyTheme($settings.theme, $settings.customTheme);
    });
    
    // Initialize with terminal panel only
    initializeGrid();
    
    // Load saved layout from server
    loadLayoutFromServer();
    
    return () => {
      unsubscribe();
    };
  });
  
  // Initialize grid with terminal
  function initializeGrid() {
    panelStore.clear();
    panelStore.addPanel('terminal', { 
      persistent: true,
      gridPosition: { row: 0, col: 0, rowSpan: 1, colSpan: 1 }
    });
  }
  
  // Load layout from server
  async function loadLayoutFromServer() {
    try {
      const response = await fetch('/api/panels/layout');
      if (response.ok) {
        const layout = await response.json();
        if (layout && layout.panels) {
          panelStore.clear();
          layout.panels.forEach((panel: any) => {
            panelStore.addPanel(panel.type, panel);
          });
          gridColumns = layout.gridColumns || 1;
          gridRows = layout.gridRows || 1;
        }
      }
    } catch (error) {
      console.error('Failed to load layout:', error);
    }
  }
  
  // Save layout to server
  async function saveLayoutToServer() {
    try {
      await fetch('/api/panels/layout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          panels: $panels,
          gridColumns,
          gridRows
        })
      });
    } catch (error) {
      console.error('Failed to save layout:', error);
    }
  }
  
  // Handle panel actions
  function handlePanelAction(event: CustomEvent) {
    const { action, panelType, panelData } = event.detail;
    
    switch (action) {
      case 'add':
        addPanelToGrid(panelType, panelData);
        break;
      case 'remove':
        if (panelData?.id) {
          panelStore.removePanel(panelData.id);
          reorganizeGrid();
        }
        break;
      case 'reset':
        resetLayout();
        break;
    }
  }
  
  // Add panel to grid
  function addPanelToGrid(type: string, data?: any) {
    const newPanel = {
      ...data,
      gridPosition: findNextGridPosition()
    };
    panelStore.addPanel(type, newPanel);
    saveLayoutToServer();
  }
  
  // Find next available grid position
  function findNextGridPosition() {
    // Stack vertically by default
    const row = $panels.length;
    return { row, col: 0, rowSpan: 1, colSpan: 1 };
  }
  
  // Handle panel movement
  function handlePanelMove(event: CustomEvent) {
    const { panelId, direction } = event.detail;
    const panel = $panels.find(p => p.id === panelId);
    if (!panel || !panel.gridPosition) return;
    
    const pos = panel.gridPosition;
    
    switch (direction) {
      case 'up':
        if (pos.row > 0) {
          swapPanels(panelId, pos.row, pos.row - 1);
        }
        break;
      case 'down':
        if (pos.row < gridRows - 1) {
          swapPanels(panelId, pos.row, pos.row + 1);
        }
        break;
      case 'left':
        splitPanelHorizontal(panelId, 'left');
        break;
      case 'right':
        splitPanelHorizontal(panelId, 'right');
        break;
    }
    
    saveLayoutToServer();
  }
  
  // Swap panels vertically
  function swapPanels(panelId: string, fromRow: number, toRow: number) {
    const panelA = $panels.find(p => p.id === panelId);
    const panelB = $panels.find(p => p.gridPosition?.row === toRow && p.gridPosition?.col === panelA?.gridPosition?.col);
    
    if (panelA && panelA.gridPosition && panelB && panelB.gridPosition) {
      // Swap row positions
      const tempRow = panelA.gridPosition.row;
      panelA.gridPosition.row = panelB.gridPosition.row;
      panelB.gridPosition.row = tempRow;
      
      panelStore.updatePanel(panelA.id, { gridPosition: panelA.gridPosition });
      panelStore.updatePanel(panelB.id, { gridPosition: panelB.gridPosition });
    }
  }
  
  // Split panel horizontally
  function splitPanelHorizontal(panelId: string, side: 'left' | 'right') {
    const panel = $panels.find(p => p.id === panelId);
    if (!panel || !panel.gridPosition) return;
    
    const currentRow = panel.gridPosition.row;
    const currentCol = panel.gridPosition.col;
    
    // Double the number of columns
    const newColumns = gridColumns * 2;
    
    // Update all existing panels to new grid
    $panels.forEach(p => {
      if (p.gridPosition) {
        p.gridPosition.col = p.gridPosition.col * 2;
        p.gridPosition.colSpan = p.gridPosition.colSpan * 2;
        panelStore.updatePanel(p.id, { gridPosition: p.gridPosition });
      }
    });
    
    // Now split the selected panel
    if (panel.gridPosition) {
      panel.gridPosition.colSpan = panel.gridPosition.colSpan / 2;
      if (side === 'right') {
        panel.gridPosition.col = panel.gridPosition.col + panel.gridPosition.colSpan;
      }
      panelStore.updatePanel(panelId, { gridPosition: panel.gridPosition });
    }
    
    gridColumns = newColumns;
    reorganizeGrid();
  }
  
  // Reorganize grid after changes
  function reorganizeGrid() {
    gridRows = Math.max(...$panels.map(p => (p.gridPosition?.row || 0) + 1));
    saveLayoutToServer();
  }
  
  // Reset layout
  function resetLayout() {
    initializeGrid();
    saveLayoutToServer();
  }
  
  // Update grid panels when store changes
  $: gridPanels = $panels.filter(p => p.gridPosition);
  $: gridRows = Math.max(1, ...gridPanels.map(p => (p.gridPosition?.row || 0) + 1));
</script>

<div class="grid-container">
  <!-- Panel Manager -->
  <div class="panel-manager-container">
    <PanelManager on:action={handlePanelAction} showReset={true} />
  </div>
  
  <!-- Grid Layout -->
  <div 
    class="grid-layout" 
    bind:this={gridContainer}
    style="
      display: grid;
      grid-template-columns: repeat({gridColumns}, 1fr);
      grid-template-rows: repeat({gridRows}, 1fr);
      gap: 2px;
    "
  >
    {#each gridPanels as panel (panel.id)}
      <div 
        class="grid-item"
        style="
          grid-row: {(panel.gridPosition?.row || 0) + 1};
          grid-column: {(panel.gridPosition?.col || 0) + 1} / 
                       span {Math.round(panel.gridPosition?.colSpan || 1)};
          grid-row-span: {panel.gridPosition?.rowSpan || 1};
        "
      >
        <GridPanel 
          {panel}
          component={panelComponents[panel.type]}
          {websocketUrl}
          on:move={handlePanelMove}
          on:close={() => {
            panelStore.removePanel(panel.id);
            reorganizeGrid();
          }}
        />
      </div>
    {/each}
  </div>
</div>

<!-- Loading overlay -->
{#if showLoadingOverlay}
  <div class="global-loading-overlay" transition:fade={{ duration: 400 }}>
    <img src="/splashlogo.png" alt="MorphBox" class="loading-logo" />
  </div>
{/if}

<style>
  .grid-container {
    display: flex;
    flex-direction: column;
    height: 100vh;
    width: 100vw;
    background-color: var(--bg-primary, #1e1e1e);
    color: var(--text-primary, #d4d4d4);
    overflow: hidden;
  }
  
  .panel-manager-container {
    position: fixed;
    top: 10px;
    right: 10px;
    z-index: 1000;
  }
  
  .grid-layout {
    flex: 1;
    width: 100%;
    height: 100%;
    overflow: hidden;
    background-color: var(--bg-secondary, #252526);
  }
  
  .grid-item {
    overflow: hidden;
    min-height: 0;
    min-width: 0;
  }
  
  /* Loading overlay */
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
    z-index: 2147483647;
  }
  
  .loading-logo {
    width: 100vw;
    height: 100vh;
    object-fit: contain;
    object-position: center;
  }
  
  /* Mobile responsive */
  @media (max-width: 768px) {
    .panel-manager-container {
      top: 5px;
      right: 5px;
    }
    
    .grid-layout {
      grid-template-columns: 1fr !important; /* Force single column on mobile */
      gap: 0; /* Remove gap on mobile */
    }
    
    /* Hide horizontal split buttons on mobile */
    :global(.grid-panel .control-btn:nth-child(3)),
    :global(.grid-panel .control-btn:nth-child(4)) {
      display: none;
    }
  }
  
  /* Touch-friendly adjustments */
  @media (hover: none) {
    .grid-layout {
      gap: 0;
    }
  }
</style>