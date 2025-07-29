<script lang="ts">
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import { panels, panelStore, type Panel } from '$lib/stores/panels';
  import Terminal from '$lib/Terminal.svelte';
  import Claude from '$lib/Claude.svelte';
  import FileExplorer from '$lib/panels/FileExplorer/FileExplorer.svelte';
  import CodeEditor from '$lib/panels/CodeEditor/CodeEditor.svelte';
  import Settings from '$lib/panels/Settings/Settings.svelte';
  import GridPanel from '$lib/components/GridPanel.svelte';
  import GridDropZone from '$lib/components/GridDropZone.svelte';
  import PanelManager from '$lib/components/PanelManager.svelte';
  import SectionTabs from '$lib/components/SectionTabs.svelte';
  import { settings, applyTheme } from '$lib/panels/Settings/settings-store';
  import { fade } from 'svelte/transition';
  import { panelRegistry } from '$lib/panels/registry';
  import { handleFileOpen } from '$lib/utils/fileHandler';
  
  // Static component mapping for built-in panels
  const builtinComponents = {
    terminal: Terminal,
    claude: Claude,
    fileExplorer: FileExplorer,
    'file-explorer': FileExplorer,
    codeEditor: CodeEditor,
    'code-editor': CodeEditor,
    settings: Settings
  };
  
  // Store for dynamically loaded components
  let loadedComponents: Record<string, any> = {};
  
  let showLoadingOverlay = true;
  let websocketUrl = browser ? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.hostname}:8009` : '';
  let gridContainer: HTMLElement;
  
  // Get component for a panel type
  async function getComponentForPanel(type: string) {
    // Check built-in components first
    if (builtinComponents[type]) {
      return builtinComponents[type];
    }
    
    // Check if already loaded
    if (loadedComponents[type]) {
      return loadedComponents[type];
    }
    
    // Try to load from registry
    const panelDef = panelRegistry.get(type);
    if (panelDef) {
      try {
        const component = await panelRegistry.loadComponent(type);
        if (component) {
          loadedComponents[type] = component;
          return component;
        }
      } catch (error) {
        console.error(`Failed to load panel component: ${type}`, error);
      }
    }
    
    return null;
  }
  
  // Grid layout state
  let gridPanels: Panel[] = [];
  let gridColumns = 2; // Start with 2 columns for more flexibility
  let gridRows = 1;
  
  // Drag and drop state
  let draggedPanelId: string | null = null;
  let dropTargetCell: { row: number; col: number } | null = null;
  
  // Resize state
  let resizingPanelId: string | null = null;
  let resizeStartPos: { row: number; col: number; rowSpan: number; colSpan: number } | null = null;
  let resizeStartSize: { width: number; height: number } | null = null;
  let tempResizeStyles: Record<string, { width?: string; height?: string; left?: string; top?: string }> = {};
  
  // Create initial terminal panel directly
  const initialTerminal: Panel = {
    id: 'terminal-initial',
    type: 'terminal',
    title: 'Terminal',
    workspaceId: 'workspace-1', // Default workspace
    position: { x: 0, y: 0 },
    size: { width: 400, height: 300 },
    persistent: true,
    gridPosition: { row: 0, col: 0, rowSpan: 1, colSpan: 1 }
  };
  
  interface GridCell {
    row: number;
    col: number;
    panel?: Panel;
  }
  
  // Initialize on mount
  onMount(async () => {
    // Hide loading overlay
    setTimeout(() => {
      showLoadingOverlay = false;
    }, 1500);
    
    // Load settings and apply theme
    settings.load();
    const unsubscribe = settings.subscribe($settings => {
      applyTheme($settings.theme, $settings.customTheme);
    });
    
    // Load saved layout from server OR initialize if empty
    // Give a small delay to ensure the store is ready
    setTimeout(async () => {
      const loaded = await loadLayoutFromServer();
      // Only initialize if loading from server didn't provide any panels
      if (!loaded && $panels.length === 0) {
        initializeGrid();
      }
    }, 50);
    
    return () => {
      unsubscribe();
    };
  });
  
  // Initialize grid with Claude
  function initializeGrid() {
    panelStore.clear();
    panelStore.addPanel('claude', { 
      title: 'Claude',
      gridPosition: { row: 0, col: 0, rowSpan: 1, colSpan: gridColumns }
    });
  }
  
  // Load layout from server
  async function loadLayoutFromServer(): Promise<boolean> {
    try {
      const response = await fetch('/api/panels/layout');
      if (response.ok) {
        const layout = await response.json();
        if (layout && layout.panels && layout.panels.length > 0) {
          // Only clear and restore if there are saved panels
          panelStore.clear();
          layout.panels.forEach((panel: any) => {
            // Remove id to let the store generate a new one
            const { id, ...panelWithoutId } = panel;
            panelStore.addPanel(panel.type, panelWithoutId);
          });
          gridColumns = layout.gridColumns || 1;
          gridRows = layout.gridRows || 1;
          return true; // Successfully loaded panels
        }
      }
    } catch (error) {
      console.error('Failed to load layout:', error);
    }
    return false; // No panels loaded
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
  async function handlePanelAction(event: CustomEvent) {
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
        await resetLayout();
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
    // Find the next available row
    const maxRow = gridPanels.reduce((max, panel) => {
      const panelBottom = (panel.gridPosition?.row || 0) + (panel.gridPosition?.rowSpan || 1);
      return Math.max(max, panelBottom);
    }, 0);
    
    // Default to full width for new panels
    return { row: maxRow, col: 0, rowSpan: 1, colSpan: gridColumns };
  }
  
  // Handle panel swap (drag and drop)
  function handlePanelSwap(event: CustomEvent) {
    const { fromId, toId } = event.detail;
    const fromPanel = $panels.find(p => p.id === fromId);
    const toPanel = $panels.find(p => p.id === toId);
    
    if (fromPanel?.gridPosition && toPanel?.gridPosition) {
      // Swap grid positions
      const tempPosition = { ...fromPanel.gridPosition };
      
      panelStore.updatePanel(fromId, {
        gridPosition: { ...toPanel.gridPosition }
      });
      
      panelStore.updatePanel(toId, {
        gridPosition: tempPosition
      });
      
      saveLayoutToServer();
    }
  }
  
  // Handle drag start
  function handleDragStart(event: CustomEvent) {
    draggedPanelId = event.detail.panelId;
  }
  
  // Handle drag end
  function handleDragEnd() {
    draggedPanelId = null;
    dropTargetCell = null;
  }
  
  // Handle drop on empty cell
  function handleEmptyCellDrop(event: CustomEvent) {
    const { row, col } = event.detail;
    if (!draggedPanelId) return;
    
    const panel = $panels.find(p => p.id === draggedPanelId);
    if (!panel || !panel.gridPosition) return;
    
    // Check if the cell is actually empty
    const cellOccupied = $panels.some(p => 
      p.gridPosition && 
      p.id !== draggedPanelId &&
      p.gridPosition.row === row && 
      p.gridPosition.col === col
    );
    
    if (!cellOccupied) {
      // Move the panel to the empty cell, keeping its size
      const newPosition = {
        row,
        col,
        rowSpan: panel.gridPosition.rowSpan || 1,
        colSpan: panel.gridPosition.colSpan || 1
      };
      
      // Ensure it fits in the grid
      if (col + newPosition.colSpan > gridColumns) {
        newPosition.colSpan = gridColumns - col;
      }
      
      panelStore.updatePanel(draggedPanelId, {
        gridPosition: newPosition
      });
      
      reorganizeGrid();
    }
  }
  
  // Handle resize start
  function handleResizeStart(event: CustomEvent) {
    const { panelId } = event.detail;
    const panel = $panels.find(p => p.id === panelId);
    if (panel?.gridPosition) {
      resizingPanelId = panelId;
      resizeStartPos = { ...panel.gridPosition };
      
      // Store initial size
      const panelElement = document.querySelector(`[data-panel-id="${panelId}"]`);
      if (panelElement) {
        const rect = panelElement.getBoundingClientRect();
        resizeStartSize = { width: rect.width, height: rect.height };
      }
    }
  }
  
  // Handle resize
  function handleResize(event: CustomEvent) {
    const { panelId, direction, deltaX, deltaY } = event.detail;
    if (!resizingPanelId || !resizeStartSize) return;
    
    let newStyles: { 
      width?: string; 
      height?: string; 
      left?: string;
      top?: string;
    } = {};
    
    // Get max height (80% of viewport)
    const maxHeight = window.innerHeight * 0.8;
    const minWidth = 200;
    const minHeight = 150;
    
    // Apply smooth resize based on direction using initial size
    switch (direction) {
      case 'n': // North (top)
        newStyles.height = `${Math.min(maxHeight, Math.max(minHeight, resizeStartSize.height - deltaY))}px`;
        newStyles.top = `${deltaY}px`;
        break;
      case 's': // South (bottom)
        newStyles.height = `${Math.min(maxHeight, Math.max(minHeight, resizeStartSize.height + deltaY))}px`;
        break;
      case 'e': // East (right)
        newStyles.width = `${Math.max(minWidth, resizeStartSize.width + deltaX)}px`;
        break;
      case 'w': // West (left)
        newStyles.width = `${Math.max(minWidth, resizeStartSize.width - deltaX)}px`;
        newStyles.left = `${deltaX}px`;
        break;
      case 'ne': // Northeast
        newStyles.height = `${Math.min(maxHeight, Math.max(minHeight, resizeStartSize.height - deltaY))}px`;
        newStyles.width = `${Math.max(minWidth, resizeStartSize.width + deltaX)}px`;
        newStyles.top = `${deltaY}px`;
        break;
      case 'nw': // Northwest
        newStyles.height = `${Math.min(maxHeight, Math.max(minHeight, resizeStartSize.height - deltaY))}px`;
        newStyles.width = `${Math.max(minWidth, resizeStartSize.width - deltaX)}px`;
        newStyles.top = `${deltaY}px`;
        newStyles.left = `${deltaX}px`;
        break;
      case 'se': // Southeast
        newStyles.width = `${Math.max(minWidth, resizeStartSize.width + deltaX)}px`;
        newStyles.height = `${Math.min(maxHeight, Math.max(minHeight, resizeStartSize.height + deltaY))}px`;
        break;
      case 'sw': // Southwest
        newStyles.width = `${Math.max(minWidth, resizeStartSize.width - deltaX)}px`;
        newStyles.height = `${Math.min(maxHeight, Math.max(minHeight, resizeStartSize.height + deltaY))}px`;
        newStyles.left = `${deltaX}px`;
        break;
    }
    
    // Apply temporary styles for smooth resizing
    tempResizeStyles = { ...tempResizeStyles, [panelId]: newStyles };
  }
  
  // Handle resize end
  function handleResizeEnd(event: CustomEvent) {
    const { panelId } = event.detail;
    if (!resizingPanelId || !resizeStartPos) return;
    
    // Get the current temporary styles
    const tempStyle = tempResizeStyles[panelId];
    if (tempStyle) {
      // Calculate grid cell size
      const gridElement = gridContainer;
      if (gridElement) {
        const gridRect = gridElement.getBoundingClientRect();
        const cellWidth = gridRect.width / gridColumns;
        const cellHeight = gridRect.height / gridRows;
        
        // Convert pixel sizes to grid spans
        let newColSpan = resizeStartPos.colSpan;
        let newRowSpan = resizeStartPos.rowSpan;
        
        if (tempStyle.width) {
          const widthPx = parseInt(tempStyle.width);
          newColSpan = Math.max(1, Math.round(widthPx / cellWidth));
        }
        
        if (tempStyle.height) {
          const heightPx = parseInt(tempStyle.height);
          newRowSpan = Math.max(1, Math.round(heightPx / cellHeight));
        }
        
        // Ensure panel doesn't exceed grid bounds
        if (resizeStartPos.col + newColSpan > gridColumns) {
          newColSpan = gridColumns - resizeStartPos.col;
        }
        
        // Update panel with new grid position
        panelStore.updatePanel(panelId, {
          gridPosition: {
            ...resizeStartPos,
            colSpan: newColSpan,
            rowSpan: newRowSpan
          }
        });
      }
    }
    
    // Clear temporary styles and state
    tempResizeStyles = {};
    resizingPanelId = null;
    resizeStartPos = null;
    resizeStartSize = null;
    
    reorganizeGrid();
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
    }
    
    saveLayoutToServer();
  }
  
  // Swap panels vertically
  function swapPanels(panelId: string, fromRow: number, toRow: number) {
    const panelA = $panels.find(p => p.id === panelId);
    if (!panelA || !panelA.gridPosition) return;
    
    const panelB = $panels.find(p => 
      p.gridPosition?.row === toRow && 
      p.gridPosition?.col === panelA.gridPosition.col
    );
    
    if (panelB && panelB.gridPosition) {
      // Direct swap with another panel
      panelStore.updatePanel(panelA.id, { 
        gridPosition: { ...panelA.gridPosition, row: toRow }
      });
      panelStore.updatePanel(panelB.id, { 
        gridPosition: { ...panelB.gridPosition, row: fromRow }
      });
    } else {
      // No panel at target position, just move there
      // First check if any panel occupies that row
      const panelsAtTargetRow = $panels.filter(p => 
        p.gridPosition?.row === toRow
      );
      
      if (panelsAtTargetRow.length === 0) {
        // Empty row, just move the panel
        panelStore.updatePanel(panelId, {
          gridPosition: { ...panelA.gridPosition, row: toRow }
        });
      } else {
        // Row is occupied but not at the same column
        // Shift all panels between current and target position
        const direction = toRow > fromRow ? 1 : -1;
        const start = Math.min(fromRow, toRow);
        const end = Math.max(fromRow, toRow);
        
        // Shift panels in the range
        $panels.forEach(p => {
          if (p.gridPosition && p.id !== panelId) {
            const pRow = p.gridPosition.row;
            if (pRow >= start && pRow <= end) {
              panelStore.updatePanel(p.id, {
                gridPosition: { ...p.gridPosition, row: pRow - direction }
              });
            }
          }
        });
        
        // Move the panel to target position
        panelStore.updatePanel(panelId, {
          gridPosition: { ...panelA.gridPosition, row: toRow }
        });
      }
    }
    
    reorganizeGrid();
  }
  
  // Split panel horizontally
  function splitPanelHorizontal(panelId: string, side: 'left' | 'right') {
    const panel = $panels.find(p => p.id === panelId);
    if (!panel || !panel.gridPosition) return;
    
    // Limit maximum columns to prevent infinite splitting
    const MAX_COLUMNS = 6;
    if (gridColumns >= MAX_COLUMNS) {
      console.warn('Maximum column limit reached');
      return;
    }
    
    const currentRow = panel.gridPosition.row;
    const currentCol = panel.gridPosition.col;
    const currentColSpan = panel.gridPosition.colSpan;
    
    // Only proceed if panel is wide enough to split
    if (currentColSpan < 2 && gridColumns > 1) {
      console.warn('Panel too narrow to split');
      return;
    }
    
    // If we need more columns, double the grid (up to max)
    if (currentColSpan === 1) {
      const newColumns = Math.min(gridColumns * 2, MAX_COLUMNS);
      
      // Update all existing panels to new grid
      $panels.forEach(p => {
        if (p.gridPosition) {
          panelStore.updatePanel(p.id, { 
            gridPosition: {
              ...p.gridPosition,
              col: p.gridPosition.col * 2,
              colSpan: p.gridPosition.colSpan * 2
            }
          });
        }
      });
      
      gridColumns = newColumns;
    }
    
    // Now split the selected panel in half
    const halfSpan = Math.floor(panel.gridPosition.colSpan / 2);
    const remainingSpan = panel.gridPosition.colSpan - halfSpan;
    
    // Update the original panel to take half the space
    panelStore.updatePanel(panelId, {
      gridPosition: {
        ...panel.gridPosition,
        colSpan: halfSpan
      }
    });
    
    // Create a new terminal panel in the other half
    const newCol = side === 'left' 
      ? panel.gridPosition.col 
      : panel.gridPosition.col + halfSpan;
      
    // Shift original panel if splitting on the left
    if (side === 'left') {
      panelStore.updatePanel(panelId, {
        gridPosition: {
          ...panel.gridPosition,
          col: panel.gridPosition.col + halfSpan,
          colSpan: halfSpan
        }
      });
    }
    
    // Add new terminal panel in the split space
    panelStore.addPanel('terminal', {
      title: 'Terminal',
      gridPosition: {
        row: currentRow,
        col: newCol,
        rowSpan: 1,
        colSpan: side === 'left' ? halfSpan : remainingSpan
      }
    });
    
    reorganizeGrid();
  }
  
  // Reorganize grid after changes
  function reorganizeGrid() {
    if ($panels.length > 0) {
      gridRows = Math.max(...$panels.map(p => (p.gridPosition?.row || 0) + (p.gridPosition?.rowSpan || 1))) + 1;
    } else {
      gridRows = 1;
    }
    saveLayoutToServer();
  }
  
  // Reset layout
  async function resetLayout() {
    // Reset grid dimensions
    gridColumns = 2;
    gridRows = 1;
    
    // Clear all panels and reinitialize
    panelStore.clear();
    
    // Wait a bit for the store to update
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // Add initial terminal
    initializeGrid();
    
    // Clear server-side layout
    try {
      await fetch('/api/panels/layout', { method: 'DELETE' });
    } catch (error) {
      console.error('Failed to clear server layout:', error);
    }
    
    // Save the reset state
    saveLayoutToServer();
  }
  
  // Update grid panels when store changes
  $: {
    // Ensure no duplicate panels by using a Map
    const uniquePanels = new Map();
    $panels.filter(p => p.gridPosition).forEach(panel => {
      uniquePanels.set(panel.id, panel);
    });
    gridPanels = Array.from(uniquePanels.values());
  }
  $: gridRows = gridPanels.length > 0 
    ? Math.max(...gridPanels.map(p => (p.gridPosition?.row || 0) + (p.gridPosition?.rowSpan || 1)), 2)
    : 2;
  
  // Generate grid cells for rendering
  function getGridCells() {
    const cells = [];
    for (let row = 0; row < gridRows; row++) {
      for (let col = 0; col < gridColumns; col++) {
        cells.push({ row, col });
      }
    }
    return cells;
  }
  
  // Check if a cell is occupied
  function isCellOccupied(row: number, col: number): boolean {
    return gridPanels.some(panel => {
      const pos = panel.gridPosition;
      if (!pos) return false;
      return row >= pos.row && 
             row < pos.row + pos.rowSpan &&
             col >= pos.col && 
             col < pos.col + pos.colSpan;
    });
  }
  
  $: gridCells = getGridCells();
    
  // Map panels to their components
  let panelComponentMap: Record<string, any> = {};
  
  $: {
    // Load components for all panels
    gridPanels.forEach(async (panel) => {
      if (!panelComponentMap[panel.id]) {
        const component = await getComponentForPanel(panel.type);
        if (component) {
          panelComponentMap = { ...panelComponentMap, [panel.id]: component };
        }
      }
    });
    
    // Clean up components for removed panels
    const currentPanelIds = new Set(gridPanels.map(p => p.id));
    Object.keys(panelComponentMap).forEach(id => {
      if (!currentPanelIds.has(id)) {
        const newMap = { ...panelComponentMap };
        delete newMap[id];
        panelComponentMap = newMap;
      }
    });
  }
</script>

<div class="grid-container">
  <!-- Section Tabs with Panel Manager -->
  <SectionTabs>
    <div slot="panel-manager">
      <PanelManager on:action={handlePanelAction} showReset={true} />
    </div>
  </SectionTabs>
  
  <!-- Grid Layout -->
  <div 
    class="grid-layout" 
    bind:this={gridContainer}
    style="
      display: grid;
      grid-template-columns: repeat({gridColumns}, 1fr);
      grid-template-rows: repeat({gridRows}, minmax(200px, 1fr));
      gap: 4px;
      align-content: start;
    "
  >
    <!-- Render empty cells first -->
    {#each gridCells as cell}
      {#if !isCellOccupied(cell.row, cell.col)}
        <div 
          class="grid-item empty-cell"
          style="
            grid-row: {cell.row + 1};
            grid-column: {cell.col + 1};
            z-index: {draggedPanelId ? 2 : 0};
          "
        >
          <GridDropZone 
            row={cell.row}
            col={cell.col}
            isDragging={!!draggedPanelId}
            on:drop={handleEmptyCellDrop}
          />
        </div>
      {/if}
    {/each}
    
    <!-- Render panels on top -->
    {#each gridPanels as panel (panel.id)}
      <div 
        class="grid-item"
        style="
          grid-row: {(panel.gridPosition?.row || 0) + 1} / span {panel.gridPosition?.rowSpan || 1};
          grid-column: {(panel.gridPosition?.col || 0) + 1} / span {panel.gridPosition?.colSpan || 1};
          z-index: 1;
        "
      >
        {#if panelComponentMap[panel.id]}
          <div 
            class="panel-wrapper" 
            class:resizing={resizingPanelId === panel.id}
            data-panel-id={panel.id}
            style={tempResizeStyles[panel.id] ? 
              `width: ${tempResizeStyles[panel.id].width || 'auto'}; 
               height: ${tempResizeStyles[panel.id].height || 'auto'};
               ${tempResizeStyles[panel.id].left ? `left: ${tempResizeStyles[panel.id].left};` : ''}
               ${tempResizeStyles[panel.id].top ? `top: ${tempResizeStyles[panel.id].top};` : ''}
               ${tempResizeStyles[panel.id].left || tempResizeStyles[panel.id].top ? 'position: relative;' : ''}` : 
              ''}
          >
            <GridPanel 
              {panel}
              component={panelComponentMap[panel.id]}
              {websocketUrl}
              on:move={handlePanelMove}
              on:swap={handlePanelSwap}
              on:dragstart={handleDragStart}
              on:dragend={handleDragEnd}
              on:resize={handleResize}
              on:resizestart={handleResizeStart}
              on:resizeend={handleResizeEnd}
              on:open={handleFileOpen}
              on:close={() => {
                panelStore.removePanel(panel.id);
                reorganizeGrid();
              }}
            />
          </div>
        {:else}
          <div class="loading-panel">
            <p>Loading panel...</p>
          </div>
        {/if}
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
  
  .grid-layout {
    flex: 1;
    width: 100%;
    min-height: 400px;
    overflow-x: hidden;
    overflow-y: auto;
    scroll-behavior: smooth;
    background-color: var(--bg-secondary, #252526);
    padding: 8px;
    box-sizing: border-box;
  }
  
  .grid-item {
    overflow: hidden;
    min-height: 0;
    min-width: 0;
    position: relative;
  }
  
  .grid-item.empty-cell {
    pointer-events: auto;
  }
  
  .panel-wrapper {
    width: 100%;
    height: 100%;
    position: relative;
  }
  
  .panel-wrapper.resizing {
    opacity: 0.8;
    box-shadow: 0 0 0 2px var(--accent-color, #0e639c);
  }
  
  .loading-panel {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    background-color: var(--panel-bg, #2d2d30);
    border: 1px solid var(--panel-border, #3e3e42);
    color: var(--text-secondary, #858585);
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
    .grid-layout {
      grid-template-columns: 1fr !important; /* Force single column on mobile */
      gap: 0; /* Remove gap on mobile */
      padding: 4px;
    }
    
  }
  
  /* Touch-friendly adjustments */
  @media (hover: none) {
    .grid-layout {
      gap: 0;
    }
  }
</style>