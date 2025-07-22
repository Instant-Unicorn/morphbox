<script lang="ts">
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import { panels, panelStore, type Panel } from '$lib/stores/panels';
  import Terminal from '$lib/Terminal.svelte';
  import Claude from '$lib/Claude.svelte';
  import FileExplorer from '$lib/panels/FileExplorer/FileExplorer.svelte';
  import CodeEditor from '$lib/panels/CodeEditor/CodeEditor.svelte';
  import Settings from '$lib/panels/Settings/Settings.svelte';
  import PromptQueue from '$lib/panels/PromptQueue/PromptQueue.svelte';
    import RowPanel from '$lib/components/RowPanel.svelte';
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
    settings: Settings,
    promptQueue: PromptQueue,
    'prompt-queue': PromptQueue
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
  
  // Responsive state
  let viewportWidth = browser ? window.innerWidth : 1200;
  let viewportHeight = browser ? window.innerHeight : 800;
  let isCompactMode = false;
  let stackedLayout = false;
  
  // Responsive breakpoints
  const BREAKPOINTS = {
    mobile: 768,
    tablet: 1024,
    desktop: 1280
  };
  
  // Update responsive state based on viewport
  function updateResponsiveState() {
    if (!browser) return;
    
    viewportWidth = window.innerWidth;
    viewportHeight = window.innerHeight;
    
    // Determine if we should stack panels
    const shouldStack = viewportWidth < BREAKPOINTS.mobile || 
                       (rows.some(row => row.panels.length > 2) && viewportWidth < BREAKPOINTS.tablet);
    
    if (shouldStack !== stackedLayout) {
      stackedLayout = shouldStack;
      reorganizeLayoutForViewport();
    }
    
    isCompactMode = viewportWidth < BREAKPOINTS.tablet;
  }
  
  // Reorganize layout when viewport changes significantly
  function reorganizeLayoutForViewport() {
    if (stackedLayout) {
      // Convert multi-panel rows to single-panel rows
      const allPanels = rows.flatMap(row => row.panels);
      rows = allPanels.map((panel, index) => ({
        id: `row-${index}`,
        panels: [{ ...panel, widthPercent: 100 }],
        height: Math.max(200, viewportHeight / Math.max(3, allPanels.length))
      }));
    } else {
      // Restore original layout from server
      loadLayoutFromServer();
    }
  }
  
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
  
  // Debounce function for resize events
  function debounce(func: Function, wait: number) {
    let timeout: NodeJS.Timeout;
    return function executedFunction(...args: any[]) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
  
  // Initialize on mount
  onMount(async () => {
    console.log('🚀 RowLayout: Component mounted');
    
    // Ensure loading overlay is removed even if there's an error
    const removeLoadingOverlay = () => {
      showLoadingOverlay = false;
      console.log('🎭 Loading overlay removed');
    };
    
    // Set timeout to remove overlay
    const timeoutId = setTimeout(removeLoadingOverlay, 750);
    
    // Failsafe: Remove overlay after 3 seconds no matter what
    const failsafeTimeoutId = setTimeout(() => {
      if (showLoadingOverlay) {
        console.warn('⚠️ Failsafe: Forcing loading overlay removal after 3 seconds');
        removeLoadingOverlay();
      }
    }, 3000);
    
    let unsubscribe: (() => void) | undefined;
    
    try {
      settings.load();
      unsubscribe = settings.subscribe($settings => {
        applyTheme($settings.theme, $settings.customTheme);
        
        // Apply panel spacing
        if ($settings.panels?.panelSpacing !== undefined) {
          document.documentElement.style.setProperty('--panel-spacing', `${$settings.panels.panelSpacing}px`);
        }
      });
    } catch (error) {
      console.error('❌ Error during initialization:', error);
      // Make sure overlay is removed even on error
      clearTimeout(timeoutId);
      removeLoadingOverlay();
    }
    
    // Set up responsive handling
    updateResponsiveState();
    
    // Debounced resize handler
    const debouncedResize = debounce(updateResponsiveState, 150);
    
    // Add resize listener
    window.addEventListener('resize', debouncedResize);
    
    // Add ResizeObserver for container-based responsiveness
    let resizeObserver: ResizeObserver;
    if (layoutContainer && 'ResizeObserver' in window) {
      resizeObserver = new ResizeObserver(debounce(() => {
        updateResponsiveState();
      }, 150));
      resizeObserver.observe(layoutContainer);
    }
    
    // Load saved layout from server OR initialize if empty
    setTimeout(async () => {
      // Clear any stale sessionStorage data that might conflict
      if (browser && sessionStorage.getItem('morphbox-panel-state')) {
        const staleData = sessionStorage.getItem('morphbox-panel-state');
        console.log('⚠️ Clearing potentially stale sessionStorage data:', staleData);
        sessionStorage.removeItem('morphbox-panel-state');
      }
      
      const loaded = await loadLayoutFromServer();
      if (!loaded && $panels.length === 0) {
        initializeLayout();
      }
      // Update responsive state after layout loads
      updateResponsiveState();
      
      // Log actual rendered dimensions after DOM updates
      setTimeout(() => {
        logRenderedDimensions();
      }, 100);
    }, 50);
    
    return () => {
      clearTimeout(timeoutId);
      clearTimeout(failsafeTimeoutId);
      
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
      window.removeEventListener('resize', debouncedResize);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  });
  
  // Initialize layout with Claude
  function initializeLayout() {
    panelStore.clear();
    
    // Get row height from settings
    const currentSettings = $settings;
    const rowHeight = currentSettings.panels?.rowHeight || 400;
    
    const newPanel = panelStore.addPanel('claude', { 
      title: 'Claude',
      rowIndex: 0,
      widthPercent: 100,
      heightPixels: rowHeight,
      orderInRow: 0
    });
    
    // Create initial row
    rows = [{
      id: 'row-0',
      panels: [$panels[0]],
      height: rowHeight
    }];
  }
  
  // Organize panels into rows
  function organizePanelsIntoRows() {
    const rowMap = new Map<number, Panel[]>();
    
    // Get default row height from settings
    const currentSettings = $settings;
    const defaultRowHeight = currentSettings.panels?.rowHeight || 400;
    
    console.log('🔍 organizePanelsIntoRows: Starting organization');
    console.log('Total panels:', $panels.length);
    console.log('All panels details:', $panels.map(p => ({
      id: p.id,
      type: p.type,
      title: p.title,
      rowIndex: p.rowIndex,
      widthPercent: p.widthPercent,
      orderInRow: p.orderInRow
    })));
    console.log('Call stack:', new Error().stack?.split('\n').slice(2, 5).join('\n'));
    
    // Group panels by row index
    $panels.forEach(panel => {
      const rowIndex = panel.rowIndex ?? 0;
      if (!rowMap.has(rowIndex)) {
        rowMap.set(rowIndex, []);
      }
      rowMap.get(rowIndex)!.push(panel);
      
      console.log(`Panel ${panel.id}:`, {
        type: panel.type,
        title: panel.title,
        rowIndex: panel.rowIndex,
        widthPercent: panel.widthPercent,
        orderInRow: panel.orderInRow
      });
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
        height: panels[0]?.heightPixels ?? defaultRowHeight
      }));
      
    console.log('📊 Organized rows:', rows.map(row => ({
      id: row.id,
      panelCount: row.panels.length,
      totalWidth: row.panels.reduce((sum, p) => sum + (p.widthPercent || 0), 0),
      height: row.height
    })));
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
    
    // Only recalculate widths if this was an actual drag operation (not initial load)
    // The widthPercent should already be set correctly for the moved panel
    if (draggedPanelId) {
      console.log('📐 Recalculating widths after drag operation');
      setTimeout(() => {
        recalculateRowWidths();
      }, 0);
    }
  }
  
  // Recalculate panel widths within rows
  function recalculateRowWidths(forceEqualWidths = false, isInitialLoad = false) {
    console.log('🔄 recalculateRowWidths called:', { forceEqualWidths, isInitialLoad });
    
    rows.forEach(row => {
      const panelCount = row.panels.length;
      if (panelCount > 0) {
        // Check if we need to recalculate widths
        const totalWidth = row.panels.reduce((sum, p) => sum + (p.widthPercent || 0), 0);
        const needsRecalculation = forceEqualWidths || Math.abs(totalWidth - 100) > 0.1;
        
        console.log(`  Row ${row.id}:`, {
          panelCount,
          totalWidth,
          needsRecalculation,
          panels: row.panels.map(p => ({ id: p.id, width: p.widthPercent }))
        });
        
        // During initial load, if there's only one panel with 100% width, don't recalculate
        if (isInitialLoad && panelCount === 1 && Math.abs(totalWidth - 100) < 0.1) {
          console.log(`  ✅ Single panel with correct width, skipping recalculation`);
          return;
        }
        
        if (needsRecalculation && !isInitialLoad) {
          const widthPerPanel = 100 / panelCount;
          console.log(`  ⚠️ Recalculating widths to ${widthPerPanel}% per panel`);
          row.panels.forEach((panel, index) => {
            panelStore.updatePanel(panel.id, {
              widthPercent: widthPerPanel,
              orderInRow: index
            });
          });
        } else {
          // Just update orderInRow without changing widths
          row.panels.forEach((panel, index) => {
            panelStore.updatePanel(panel.id, {
              orderInRow: index
            });
          });
        }
      }
    });
  }
  
  // Handle panel resize
  function handlePanelResize(event: CustomEvent) {
    const { panelId, newWidth, newHeight, isLeftResize, moveTop, deltaY } = event.detail;
    const panel = $panels.find(p => p.id === panelId);
    if (!panel) return;
    
    // Update panel size
    const updates: Partial<Panel> = {};
    
    if (newWidth !== undefined) {
      // For any resize, ensure we don't exceed 100% total width in the row
      const row = rows.find(r => r.panels.some(p => p.id === panelId));
      if (row) {
        const otherPanelsWidth = row.panels
          .filter(p => p.id !== panelId)
          .reduce((sum, p) => sum + (p.widthPercent || 0), 0);
        
        // Constrain new width so total doesn't exceed 100%
        const maxAllowedWidth = 100 - otherPanelsWidth;
        const constrainedWidth = Math.min(newWidth, maxAllowedWidth);
        
        updates.widthPercent = constrainedWidth;
        
        // For left resize, we need to redistribute space
        if (isLeftResize && row.panels.length > 1) {
          // Simple approach: just resize this panel, let CSS handle the layout
          // The flex layout will automatically adjust other panels
        }
      } else {
        updates.widthPercent = newWidth;
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
    recalculateRowWidths(true); // Force equal widths when closing a panel
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
    // Always create a new row at the bottom for new panels
    const newRowIndex = rows.length > 0 ? Math.max(...rows.map(r => parseInt(r.id.split('-')[1]))) + 1 : 0;
    
    // Get row height from settings
    const currentSettings = $settings;
    const rowHeight = currentSettings.panels?.rowHeight || 400;
    
    panelStore.addPanel(type, {
      ...data,
      rowIndex: newRowIndex,
      widthPercent: 100, // New panels take full width of new row
      heightPixels: rowHeight,
      orderInRow: 0
    });
    
    organizePanelsIntoRows();
    saveLayoutToServer();
    
    // Wait for DOM update then scroll to the new row
    setTimeout(() => {
      const newRow = document.querySelector(`#row-${newRowIndex}`);
      if (newRow && layoutContainer) {
        // Calculate the position to scroll to, accounting for any header height
        const rowTop = newRow.getBoundingClientRect().top;
        const containerTop = layoutContainer.getBoundingClientRect().top;
        const scrollTop = layoutContainer.scrollTop + (rowTop - containerTop);
        
        // Smooth scroll to the new row
        layoutContainer.scrollTo({
          top: scrollTop,
          behavior: 'smooth'
        });
      }
    }, 100);
  }
  
  // Load layout from server
  async function loadLayoutFromServer(): Promise<boolean> {
    try {
      const response = await fetch('/api/panels/layout');
      if (response.ok) {
        const layout = await response.json();
        if (layout && layout.panels && layout.panels.length > 0) {
          // Get current panels
          const currentPanels = $panels;
          
          // If we already have panels, update them instead of clearing
          if (currentPanels.length > 0) {
            console.log('📥 Updating existing layout from server');
            
            // Update existing panels to match server layout
            layout.panels.forEach((serverPanel: any) => {
              const existingPanel = currentPanels.find(p => p.type === serverPanel.type);
              if (existingPanel) {
                // Update existing panel properties without destroying it
                const { id, ...updateProps } = serverPanel;
                console.log('[loadLayoutFromServer] Updating existing panel:', existingPanel.id, 'with props:', updateProps);
                // Only update if properties actually changed
                const hasChanges = Object.keys(updateProps).some(key => 
                  JSON.stringify(existingPanel[key]) !== JSON.stringify(updateProps[key])
                );
                if (hasChanges) {
                  panelStore.updatePanel(existingPanel.id, updateProps);
                } else {
                  console.log('[loadLayoutFromServer] No changes for panel:', existingPanel.id);
                }
              } else {
                // Add new panel if it doesn't exist
                const { id, ...panelWithoutId } = serverPanel;
                panelStore.addPanel(serverPanel.type, panelWithoutId);
              }
            });
            
            // Remove panels that aren't in the server layout
            currentPanels.forEach(panel => {
              if (!layout.panels.find((p: any) => p.type === panel.type)) {
                panelStore.removePanel(panel.id);
              }
            });
          } else {
            // First time loading - create new panels
            panelStore.clear();
            layout.panels.forEach((panel: any) => {
              const { id, ...panelWithoutId } = panel;
              panelStore.addPanel(panel.type, panelWithoutId);
            });
          }
          
          organizePanelsIntoRows();
          // Don't recalculate widths on initial load - preserve saved widths
          console.log('📥 Loaded layout from server, preserving saved widths');
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
  $: if ($panels && browser) {
    try {
      console.log('🔄 Reactive: panels changed, organizing into rows');
      console.log('Panel count:', $panels.length);
      console.log('draggedPanelId:', draggedPanelId);
      organizePanelsIntoRows();
      // Log after reactive update
      setTimeout(() => {
        logRenderedDimensions();
      }, 0);
    } catch (error) {
      console.error('❌ Error organizing panels:', error);
      // Initialize with empty rows to prevent UI from being stuck
      rows = [];
    }
  }
  
  // Function to log actual rendered dimensions
  function logRenderedDimensions() {
    if (!browser || !layoutContainer) return;
    
    console.log('📐 Rendered Dimensions:');
    console.log('Layout container:', {
      width: layoutContainer.offsetWidth,
      clientWidth: layoutContainer.clientWidth,
      scrollWidth: layoutContainer.scrollWidth,
      computedStyle: {
        width: window.getComputedStyle(layoutContainer).width,
        maxWidth: window.getComputedStyle(layoutContainer).maxWidth,
        padding: window.getComputedStyle(layoutContainer).padding
      }
    });
    
    rows.forEach(row => {
      const rowElement = document.getElementById(row.id);
      if (rowElement) {
        console.log(`Row ${row.id}:`, {
          width: rowElement.offsetWidth,
          computedWidth: window.getComputedStyle(rowElement).width,
          computedFlex: window.getComputedStyle(rowElement).flex,
          computedDisplay: window.getComputedStyle(rowElement).display
        });
        
        row.panels.forEach(panel => {
          const panelContainer = rowElement.querySelector(`[data-panel-id="${panel.id}"]`);
          if (panelContainer) {
            const panelElement = panelContainer.querySelector('.row-panel');
            console.log(`  Panel ${panel.id} (${panel.type}):`, {
              widthPercent: panel.widthPercent,
              containerStyle: panelContainer.getAttribute('style'),
              containerWidth: panelContainer.offsetWidth,
              containerComputedStyle: {
                width: window.getComputedStyle(panelContainer).width,
                flex: window.getComputedStyle(panelContainer).flex,
                maxWidth: window.getComputedStyle(panelContainer).maxWidth
              },
              panelWidth: panelElement?.offsetWidth,
              panelComputedWidth: panelElement ? window.getComputedStyle(panelElement).width : 'N/A'
            });
          }
        });
      }
    });
  }
  
  // Load components for panels
  let panelComponentMap: Record<string, any> = {};
  
  // Use a more stable approach to prevent component remounting
  async function loadPanelComponents() {
    const newMap: Record<string, any> = {};
    
    for (const panel of $panels) {
      // Reuse existing component if available
      if (panelComponentMap[panel.id]) {
        newMap[panel.id] = panelComponentMap[panel.id];
      } else {
        const component = await getComponentForPanel(panel.type);
        if (component) {
          newMap[panel.id] = component;
        }
      }
    }
    
    panelComponentMap = newMap;
  }
  
  // Only reload components when panels change
  $: if ($panels) {
    loadPanelComponents();
  }
</script>

<div class="layout-container responsive-container" class:compact-mode={isCompactMode} class:stacked-layout={stackedLayout}>
  <!-- Section Tabs with Panel Manager -->
  <SectionTabs>
    <div slot="panel-manager">
      <PanelManager on:action={handlePanelAction} showReset={true} />
    </div>
  </SectionTabs>
  
  <!-- Row-based Layout -->
  <div 
    class="row-layout responsive-container" 
    bind:this={layoutContainer}
    data-viewport-width={viewportWidth}
    data-viewport-height={viewportHeight}
  >
    {#each rows as row (row.id)}
      <div 
        id={row.id}
        class="row" 
        style="height: {stackedLayout ? 'auto' : row.height + 'px'}; min-height: {stackedLayout ? 'var(--min-panel-height)' : row.height + 'px'};"
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
                style="width: {panel.widthPercent}%; flex: 0 0 {panel.widthPercent}%; max-width: {panel.widthPercent}%;"
                data-panel-id={panel.id}
              >
                {#key panel.id}
                  <RowPanel 
                    {panel}
                    component={panelComponentMap[panel.id]}
                    {websocketUrl}
                    isDragging={draggedPanelId === panel.id}
                    on:dragstart={handleDragStart}
                    on:dragend={handleDragEnd}
                    on:drop={handlePanelDrop}
                    on:resize={handlePanelResize}
                    on:open={handleFileOpen}
                    on:close={handlePanelClose}
                  />
                {/key}
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
    height: 100dvh;
    width: 100vw;
    background-color: var(--bg-primary, #1e1e1e);
    color: var(--text-primary, #d4d4d4);
    overflow: hidden;
    container-type: inline-size;
  }
  
  .row-layout {
    flex: 1;
    width: 100%;
    max-width: 100%;
    overflow-x: hidden;
    overflow-y: auto;
    scroll-behavior: smooth;
    background-color: var(--bg-secondary, #252526);
    /* Reduce padding to maximize space for panels */
    padding: 0;
    box-sizing: border-box;
    container-type: inline-size;
    /* Add padding at bottom to ensure last panel's resize handle is accessible */
    padding-bottom: 30px;
  }
  
  .row {
    display: flex;
    width: 100%;
    margin-bottom: var(--spacing-sm);
    position: relative;
    box-sizing: border-box;
    overflow: visible; /* Changed to visible to allow resize handles to extend beyond */
    flex-wrap: nowrap;
    transition: margin 0.3s ease;
    /* Remove padding to maximize panel width */
    padding: 0;
    /* Ensure row takes full width */
    max-width: 100%;
  }
  
  .panel-container {
    /* Remove horizontal padding to maximize panel width */
    /* padding: 0 var(--spacing-xs); */
    box-sizing: border-box;
    height: 100%;
    width: 100%;
    display: flex;
    min-width: 0; /* Allow flex items to shrink below content size */
    overflow: hidden;
    transition: width 0.3s ease, flex 0.3s ease;
    /* Ensure panel takes its allocated width */
    flex-shrink: 0;
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
  
  /* Container queries for panel-aware responsiveness */
  @container (max-width: 600px) {
    .row {
      flex-direction: column;
      margin-bottom: var(--spacing-xs);
    }
    
    .panel-container {
      width: 100% !important;
      max-width: 100% !important;
      flex: 1 1 100% !important;
      margin-bottom: var(--spacing-xs);
    }
    
    .panel-container:last-child {
      margin-bottom: 0;
    }
    
    .new-row-drop-zone {
      height: 60px;
      font-size: var(--font-size-sm);
    }
  }
  
  @container (min-width: 600px) and (max-width: 900px) {
    /* 2-column max layout for medium containers */
    .row:has(.panel-container:nth-child(3)) {
      flex-wrap: wrap;
    }
    
    .row:has(.panel-container:nth-child(3)) .panel-container {
      width: 50% !important;
      max-width: 50% !important;
      flex: 1 1 50% !important;
    }
  }
  
  /* Viewport-based responsive styles */
  @media (max-width: 768px) {
    .row-layout {
      /* Remove padding on mobile to maximize space */
      padding: 0;
    }
    
    .row {
      flex-direction: column;
      margin-bottom: var(--spacing-xs);
      min-height: auto;
      /* Add extra padding at bottom for resize handles */
      padding-bottom: 20px;
    }
    
    .panel-container {
      width: 100% !important;
      max-width: 100% !important;
      flex: 1 1 100% !important;
      /* padding: 0; Keep this to ensure no padding on mobile */
      padding: 0;
      margin-bottom: var(--spacing-xs);
    }
    
    .panel-container:last-child {
      margin-bottom: 0;
    }
    
    .empty-row,
    .new-row-drop-zone {
      height: 80px;
      font-size: var(--font-size-sm);
    }
    
    .drop-hint {
      font-size: var(--font-size-xs);
    }
  }
  
  @media (min-width: 768px) and (max-width: 1024px) {
    /* Tablet: limit to 2 panels per row */
    .row:has(.panel-container:nth-child(3)) {
      flex-wrap: wrap;
    }
    
    .row:has(.panel-container:nth-child(3)) .panel-container {
      width: 50% !important;
      max-width: 50% !important;
      flex: 1 1 calc(50% - var(--spacing-xs)) !important;
    }
  }
  
  /* Touch-friendly adjustments */
  @media (pointer: coarse) {
    .drop-hint {
      font-size: var(--font-size-base);
      padding: var(--spacing-md);
    }
    
    .new-row-drop-zone,
    .empty-row {
      min-height: var(--touch-target-min);
    }
  }
  
  /* High DPI screens */
  @media (min-resolution: 2dppx) {
    .panel-container {
      border-radius: 2px;
    }
  }
  
  /* Performance optimizations for animations */
  @media (prefers-reduced-motion: reduce) {
    .row,
    .panel-container {
      transition: none;
    }
  }
</style>