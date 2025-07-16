<script lang="ts">
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import { panels, panelStore, type Panel } from '$lib/stores/panels';
  import Terminal from '$lib/Terminal.svelte';
  import Claude from '$lib/Claude.svelte';
  import FileExplorer from '$lib/panels/FileExplorer/FileExplorer.svelte';
  import CodeEditor from '$lib/panels/CodeEditor/CodeEditor.svelte';
  import Settings from '$lib/panels/Settings/Settings.svelte';
  import RowPanel from '$lib/components/RowPanel.svelte';
  import PanelManager from '$lib/components/PanelManager.svelte';
  import SectionTabs from '$lib/components/SectionTabs.svelte';
  import { settings, applyTheme } from '$lib/panels/Settings/settings-store';
  import { fade } from 'svelte/transition';
  import { panelRegistry } from '$lib/panels/registry';
  
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
  let websocketUrl = browser ? `ws://${window.location.hostname}:8009` : '';
  let layoutContainer: HTMLElement;
  
  // Row layout state
  interface Row {
    id: string;
    panels: Panel[];
    height: number; // Height in pixels
  }
  
  let rows: Row[] = [];
  let draggedPanelId: string | null = null;
  let dropTargetInfo: { rowId: string; panelId?: string; position: 'before' | 'after' | 'split' } | null = null;
  
  // Get component for a panel type
  async function getComponentForPanel(type: string) {
    if (builtinComponents[type]) {
      return builtinComponents[type];
    }
    
    if (loadedComponents[type]) {
      return loadedComponents[type];
    }
    
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
  
  // Initialize on mount
  onMount(async () => {
    setTimeout(() => {
      showLoadingOverlay = false;
    }, 750);
    
    settings.load();
    const unsubscribe = settings.subscribe($settings => {
      applyTheme($settings.theme, $settings.customTheme);
    });
    
    // Load saved layout from server OR initialize if empty
    setTimeout(async () => {
      const loaded = await loadLayoutFromServer();
      if (!loaded && $panels.length === 0) {
        initializeLayout();
      }
    }, 50);
    
    return () => {
      unsubscribe();
    };
  });
  
  // Initialize layout with Claude
  function initializeLayout() {
    panelStore.clear();
    const newPanel = panelStore.addPanel('claude', { 
      title: 'Claude',
      rowIndex: 0,
      widthPercent: 100,
      heightPixels: 400,
      orderInRow: 0
    });
    
    // Create initial row
    rows = [{
      id: 'row-0',
      panels: [$panels[0]],
      height: 400
    }];
  }
  
  // Organize panels into rows
  function organizePanelsIntoRows() {
    const rowMap = new Map<number, Panel[]>();
    
    // Group panels by row index
    $panels.forEach(panel => {
      const rowIndex = panel.rowIndex ?? 0;
      if (!rowMap.has(rowIndex)) {
        rowMap.set(rowIndex, []);
      }
      rowMap.get(rowIndex)!.push(panel);
    });
    
    // Sort panels within each row by orderInRow
    rowMap.forEach(panelsInRow => {
      panelsInRow.sort((a, b) => (a.orderInRow ?? 0) - (b.orderInRow ?? 0));
    });
    
    // Convert to rows array
    rows = Array.from(rowMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([index, panels]) => ({
        id: `row-${index}`,
        panels,
        height: panels[0]?.heightPixels ?? 400
      }));
  }
  
  // Handle panel drag start
  function handleDragStart(event: CustomEvent) {
    draggedPanelId = event.detail.panelId;
  }
  
  // Handle panel drag end
  function handleDragEnd() {
    draggedPanelId = null;
    dropTargetInfo = null;
  }
  
  // Handle panel drop
  function handlePanelDrop(event: CustomEvent) {
    const { rowId, targetPanelId, position } = event.detail;
    if (!draggedPanelId) return;
    
    const draggedPanel = $panels.find(p => p.id === draggedPanelId);
    if (!draggedPanel) return;
    
    if (position === 'split' && targetPanelId) {
      // Split the target panel
      splitPanel(targetPanelId, draggedPanelId);
    } else {
      // Move panel to new position
      movePanel(draggedPanelId, rowId, targetPanelId, position);
    }
    
    saveLayoutToServer();
  }
  
  // Split a panel with another panel
  function splitPanel(targetPanelId: string, draggedPanelId: string) {
    const targetPanel = $panels.find(p => p.id === targetPanelId);
    const draggedPanel = $panels.find(p => p.id === draggedPanelId);
    
    if (!targetPanel || !draggedPanel) return;
    
    const targetRow = rows.find(row => row.panels.some(p => p.id === targetPanelId));
    if (!targetRow) return;
    
    // Calculate new widths (split 50/50)
    const newWidth = (targetPanel.widthPercent ?? 100) / 2;
    
    // Update target panel width
    panelStore.updatePanel(targetPanelId, {
      widthPercent: newWidth
    });
    
    // Move dragged panel to same row with new width
    panelStore.updatePanel(draggedPanelId, {
      rowIndex: targetPanel.rowIndex,
      widthPercent: newWidth,
      heightPixels: targetPanel.heightPixels,
      orderInRow: (targetPanel.orderInRow ?? 0) + 1
    });
    
    // Update order of other panels in the row
    targetRow.panels.forEach(panel => {
      if (panel.orderInRow !== undefined && panel.orderInRow > (targetPanel.orderInRow ?? 0)) {
        panelStore.updatePanel(panel.id, {
          orderInRow: panel.orderInRow + 1
        });
      }
    });
    
    organizePanelsIntoRows();
  }
  
  // Move panel to new position
  function movePanel(panelId: string, rowId: string, targetPanelId?: string, position?: 'before' | 'after') {
    const panel = $panels.find(p => p.id === panelId);
    if (!panel) return;
    
    // Store the original row index to recalculate its widths later
    const originalRowIndex = panel.rowIndex;
    
    const rowIndex = parseInt(rowId.split('-')[1]);
    const targetRow = rows.find(r => r.id === rowId);
    
    if (targetPanelId && position && targetRow) {
      // Insert before or after specific panel
      const targetPanel = targetRow.panels.find(p => p.id === targetPanelId);
      if (!targetPanel) return;
      
      const targetOrder = targetPanel.orderInRow ?? 0;
      const newOrder = position === 'before' ? targetOrder : targetOrder + 1;
      
      // Update orders of other panels
      targetRow.panels.forEach(p => {
        if (p.id !== panelId && (p.orderInRow ?? 0) >= newOrder) {
          panelStore.updatePanel(p.id, {
            orderInRow: (p.orderInRow ?? 0) + 1
          });
        }
      });
      
      // Update dragged panel
      panelStore.updatePanel(panelId, {
        rowIndex,
        orderInRow: newOrder,
        heightPixels: targetRow.height
      });
    } else {
      // Add to empty row or end of row
      const maxOrder = targetRow ? Math.max(...targetRow.panels.map(p => p.orderInRow ?? 0), -1) : -1;
      
      panelStore.updatePanel(panelId, {
        rowIndex,
        orderInRow: maxOrder + 1,
        heightPixels: targetRow?.height ?? 400,
        widthPercent: targetRow ? 100 / (targetRow.panels.length + 1) : 100
      });
    }
    
    // Reorganize first to update row structures
    organizePanelsIntoRows();
    
    // Recalculate widths for affected rows
    setTimeout(() => {
      recalculateRowWidths();
    }, 0);
  }
  
  // Recalculate panel widths within rows
  function recalculateRowWidths() {
    rows.forEach(row => {
      const panelCount = row.panels.length;
      if (panelCount > 0) {
        const widthPerPanel = 100 / panelCount;
        row.panels.forEach((panel, index) => {
          panelStore.updatePanel(panel.id, {
            widthPercent: widthPerPanel,
            orderInRow: index
          });
        });
      }
    });
  }
  
  // Handle panel resize
  function handlePanelResize(event: CustomEvent) {
    const { panelId, newWidth, newHeight, moveLeft, moveTop, deltaPercent, deltaY } = event.detail;
    const panel = $panels.find(p => p.id === panelId);
    if (!panel) return;
    
    // Update panel size
    const updates: Partial<Panel> = {};
    
    if (newWidth !== undefined) {
      updates.widthPercent = newWidth;
      
      // If resizing from left, we need to adjust adjacent panels
      if (moveLeft && deltaPercent) {
        const row = rows.find(r => r.panels.some(p => p.id === panelId));
        if (row) {
          const panelIndex = row.panels.findIndex(p => p.id === panelId);
          
          // Find the panel to the left
          if (panelIndex > 0) {
            const leftPanel = row.panels[panelIndex - 1];
            const leftPanelNewWidth = (leftPanel.widthPercent || 0) + deltaPercent;
            
            // Update the left panel's width
            panelStore.updatePanel(leftPanel.id, {
              widthPercent: Math.max(10, leftPanelNewWidth)
            });
          }
        }
      }
    }
    
    if (newHeight !== undefined) {
      updates.heightPixels = newHeight;
      
      // Update row height if this panel is taller
      const row = rows.find(r => r.panels.some(p => p.id === panelId));
      if (row) {
        if (moveTop) {
          // For top resize, maintain the bottom position
          row.height = newHeight;
        } else if (newHeight > row.height) {
          row.height = newHeight;
        }
        
        // Update all panels in row to new height
        row.panels.forEach(p => {
          panelStore.updatePanel(p.id, { heightPixels: row.height });
        });
      }
    }
    
    panelStore.updatePanel(panelId, updates);
  }
  
  // Handle panel close
  function handlePanelClose(event: CustomEvent) {
    const { panelId } = event.detail;
    panelStore.removePanel(panelId);
    recalculateRowWidths();
    organizePanelsIntoRows();
    saveLayoutToServer();
  }
  
  // Add new panel
  function handlePanelAction(event: CustomEvent) {
    const { action, panelType, panelData } = event.detail;
    
    switch (action) {
      case 'add':
        addNewPanel(panelType, panelData);
        break;
      case 'reset':
        resetLayout();
        break;
    }
  }
  
  // Add new panel to layout
  function addNewPanel(type: string, data?: any) {
    // Find the last row or create new one
    const lastRowIndex = rows.length > 0 ? rows.length - 1 : 0;
    const lastRow = rows[lastRowIndex];
    
    // Check if we should create a new row (if last row is full or doesn't exist)
    const shouldCreateNewRow = !lastRow || lastRow.panels.length >= 3;
    
    const rowIndex = shouldCreateNewRow ? lastRowIndex + 1 : lastRowIndex;
    const orderInRow = shouldCreateNewRow ? 0 : lastRow.panels.length;
    
    panelStore.addPanel(type, {
      ...data,
      rowIndex,
      widthPercent: shouldCreateNewRow ? 100 : 100 / (lastRow.panels.length + 1),
      heightPixels: 400,
      orderInRow
    });
    
    if (!shouldCreateNewRow) {
      recalculateRowWidths();
    }
    
    organizePanelsIntoRows();
    saveLayoutToServer();
  }
  
  // Load layout from server
  async function loadLayoutFromServer(): Promise<boolean> {
    try {
      const response = await fetch('/api/panels/layout');
      if (response.ok) {
        const layout = await response.json();
        if (layout && layout.panels && layout.panels.length > 0) {
          panelStore.clear();
          layout.panels.forEach((panel: any) => {
            const { id, ...panelWithoutId } = panel;
            panelStore.addPanel(panel.type, panelWithoutId);
          });
          organizePanelsIntoRows();
          return true;
        }
      }
    } catch (error) {
      console.error('Failed to load layout:', error);
    }
    return false;
  }
  
  // Save layout to server
  async function saveLayoutToServer() {
    try {
      await fetch('/api/panels/layout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          panels: $panels,
          rows: rows.map(r => ({ id: r.id, height: r.height }))
        })
      });
    } catch (error) {
      console.error('Failed to save layout:', error);
    }
  }
  
  // Reset layout
  async function resetLayout() {
    panelStore.clear();
    rows = [];
    
    await new Promise(resolve => setTimeout(resolve, 50));
    
    initializeLayout();
    
    try {
      await fetch('/api/panels/layout', { method: 'DELETE' });
    } catch (error) {
      console.error('Failed to clear server layout:', error);
    }
    
    saveLayoutToServer();
  }
  
  // Update rows when panels change
  $: if ($panels) {
    organizePanelsIntoRows();
  }
  
  // Load components for panels
  let panelComponentMap: Record<string, any> = {};
  
  $: {
    $panels.forEach(async (panel) => {
      if (!panelComponentMap[panel.id]) {
        const component = await getComponentForPanel(panel.type);
        if (component) {
          panelComponentMap = { ...panelComponentMap, [panel.id]: component };
        }
      }
    });
    
    const currentPanelIds = new Set($panels.map(p => p.id));
    Object.keys(panelComponentMap).forEach(id => {
      if (!currentPanelIds.has(id)) {
        const newMap = { ...panelComponentMap };
        delete newMap[id];
        panelComponentMap = newMap;
      }
    });
  }
</script>

<div class="layout-container">
  <!-- Section Tabs with Panel Manager -->
  <SectionTabs>
    <div slot="panel-manager">
      <PanelManager on:action={handlePanelAction} showReset={true} />
    </div>
  </SectionTabs>
  
  <!-- Row-based Layout -->
  <div 
    class="row-layout" 
    bind:this={layoutContainer}
  >
    {#each rows as row (row.id)}
      <div 
        class="row" 
        style="height: {row.height}px; min-height: {row.height}px;"
      >
        {#if row.panels.length === 0}
          <div 
            class="empty-row"
            on:dragover={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
            on:drop={(e) => {
              e.preventDefault();
              if (draggedPanelId) {
                movePanel(draggedPanelId, row.id);
              }
            }}
          >
            <div class="drop-hint">Drop panel here</div>
          </div>
        {:else}
          {#each row.panels as panel (panel.id)}
            {#if panelComponentMap[panel.id]}
              <div 
                class="panel-container"
                style="width: {panel.widthPercent}%; flex: 0 0 {panel.widthPercent}%;"
              >
                <RowPanel 
                  {panel}
                  component={panelComponentMap[panel.id]}
                  {websocketUrl}
                  isDragging={draggedPanelId === panel.id}
                  on:dragstart={handleDragStart}
                  on:dragend={handleDragEnd}
                  on:drop={handlePanelDrop}
                  on:resize={handlePanelResize}
                  on:close={handlePanelClose}
                />
              </div>
            {/if}
          {/each}
        {/if}
      </div>
    {/each}
    
    <!-- Add new row drop zone -->
    {#if draggedPanelId}
      <div 
        class="new-row-drop-zone"
        on:dragover={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
        on:drop={(e) => {
          e.preventDefault();
          if (draggedPanelId) {
            const newRowIndex = rows.length;
            movePanel(draggedPanelId, `row-${newRowIndex}`);
          }
        }}
      >
        <div class="drop-hint">Drop here to create new row</div>
      </div>
    {/if}
  </div>
</div>

<!-- Loading overlay -->
{#if showLoadingOverlay}
  <div class="global-loading-overlay" transition:fade={{ duration: 400 }}>
    <img src="/splashlogo.png" alt="MorphBox" class="loading-logo" />
  </div>
{/if}

<style>
  .layout-container {
    display: flex;
    flex-direction: column;
    height: 100vh;
    width: 100vw;
    background-color: var(--bg-primary, #1e1e1e);
    color: var(--text-primary, #d4d4d4);
    overflow: hidden;
  }
  
  .row-layout {
    flex: 1;
    width: 100%;
    max-width: 100%;
    overflow-x: hidden;
    overflow-y: auto;
    scroll-behavior: smooth;
    background-color: var(--bg-secondary, #252526);
    padding: 8px;
    box-sizing: border-box;
  }
  
  .row {
    display: flex;
    width: 100%;
    margin-bottom: 8px;
    position: relative;
    box-sizing: border-box;
    overflow: hidden; /* Prevent panels from extending beyond row */
  }
  
  .panel-container {
    padding: 0 4px;
    box-sizing: border-box;
    height: 100%;
    display: flex;
    min-width: 0; /* Allow flex items to shrink below content size */
    overflow: hidden;
  }
  
  .empty-row {
    width: 100%;
    height: 100%;
    border: 2px dashed var(--panel-border, #3e3e42);
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: var(--bg-tertiary, #2d2d30);
    border-radius: 4px;
  }
  
  .new-row-drop-zone {
    height: 100px;
    margin: 8px 0;
    border: 2px dashed var(--accent-color, #0e639c);
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: rgba(14, 99, 156, 0.1);
    border-radius: 4px;
  }
  
  .drop-hint {
    color: var(--text-secondary, #858585);
    font-size: 14px;
    pointer-events: none;
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
    .row-layout {
      padding: 4px;
    }
    
    .row {
      margin-bottom: 4px;
    }
    
    .panel-container {
      padding: 0 2px;
    }
  }
</style>