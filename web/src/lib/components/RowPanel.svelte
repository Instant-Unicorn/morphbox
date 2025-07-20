<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import type { Panel } from '$lib/stores/panels';
  import { panelStore } from '$lib/stores/panels';
  import { X, GripVertical, Palette, Keyboard, CornerDownLeft } from 'lucide-svelte';
  
  export let panel: Panel;
  export let component: any;
  export let websocketUrl: string = '';
  export let isDragging: boolean = false;
  
  let componentInstance: any;
  
  const dispatch = createEventDispatcher();
  
  let showColorPopup = false;
  let colorPopupElement: HTMLDivElement;
  let headerColorInput: HTMLInputElement;
  let backgroundColorInput: HTMLInputElement;
  let borderColorInput: HTMLInputElement;
  let dropZone: 'before' | 'after' | 'center' | null = null;
  
  // Resize state
  let isResizing = false;
  let resizeDirection: 'horizontal' | 'vertical' | null = null;
  let resizeSide: 'left' | 'right' | 'top' | 'bottom' | null = null;
  let resizeStartX = 0;
  let resizeStartY = 0;
  let resizeStartWidth = 0;
  let resizeStartHeight = 0;
  let panelElement: HTMLElement;
  
  // Log panel dimensions on mount and when panel changes
  onMount(() => {
    logPanelDimensions();
    
    // Add immediate check for width issue
    setTimeout(() => {
      if (panelElement) {
        const rect = panelElement.getBoundingClientRect();
        const parentRect = panelElement.parentElement?.getBoundingClientRect();
        const computedStyle = window.getComputedStyle(panelElement);
        
        console.log(`🔍 [PANEL WIDTH DEBUG] Panel ${panel.id} (${panel.type}):`, {
          panel: {
            widthPercent: panel.widthPercent,
            elementWidth: rect.width,
            computedWidth: computedStyle.width,
            flex: computedStyle.flex,
            flexGrow: computedStyle.flexGrow,
            flexShrink: computedStyle.flexShrink,
            flexBasis: computedStyle.flexBasis
          },
          parent: parentRect ? {
            width: parentRect.width,
            flex: window.getComputedStyle(panelElement.parentElement!).flex
          } : null,
          viewportWidth: window.innerWidth,
          percentageOfViewport: (rect.width / window.innerWidth * 100).toFixed(1) + '%'
        });
        
        // Check for siblings
        const siblings = Array.from(panelElement.parentElement?.children || [])
          .filter(el => el !== panelElement && el.classList.contains('panel-container'));
        
        if (siblings.length > 0) {
          console.log(`⚠️ Found ${siblings.length} sibling panels in same container!`);
          siblings.forEach((sib, i) => {
            const sibRect = sib.getBoundingClientRect();
            console.log(`  Sibling ${i}: width=${sibRect.width}px`);
          });
        }
      }
    }, 100);
    
    // Set up a resize observer to log when dimensions change
    if (panelElement && 'ResizeObserver' in window) {
      const resizeObserver = new ResizeObserver(() => {
        logPanelDimensions();
      });
      resizeObserver.observe(panelElement);
      
      return () => {
        resizeObserver.disconnect();
        document.removeEventListener('click', handleClickOutside);
      };
    } else {
      return () => {
        document.removeEventListener('click', handleClickOutside);
      };
    }
  });
  
  $: if (panel && panelElement) {
    // Log when panel data changes
    console.log(`📄 Panel ${panel.id} (${panel.type}) data:`, {
      widthPercent: panel.widthPercent,
      heightPixels: panel.heightPixels,
      rowIndex: panel.rowIndex,
      orderInRow: panel.orderInRow
    });
  }
  
  function logPanelDimensions() {
    if (!panelElement) return;
    
    const parentContainer = panelElement.parentElement;
    const row = panelElement.closest('.row');
    
    console.log(`📦 RowPanel ${panel.id} (${panel.type}) dimensions:`, {
      panelElement: {
        offsetWidth: panelElement.offsetWidth,
        clientWidth: panelElement.clientWidth,
        computedWidth: window.getComputedStyle(panelElement).width
      },
      parentContainer: parentContainer ? {
        offsetWidth: parentContainer.offsetWidth,
        clientWidth: parentContainer.clientWidth,
        computedWidth: window.getComputedStyle(parentContainer).width,
        computedFlex: window.getComputedStyle(parentContainer).flex
      } : 'No parent',
      row: row ? {
        offsetWidth: row.offsetWidth,
        clientWidth: row.clientWidth,
        computedWidth: window.getComputedStyle(row).width
      } : 'No row'
    });
  }
  
  function handleClose() {
    dispatch('close', { panelId: panel.id });
  }
  
  function toggleColorPopup() {
    showColorPopup = !showColorPopup;
    
    if (showColorPopup) {
      // Add click outside handler
      setTimeout(() => {
        document.addEventListener('click', handleClickOutside);
      }, 0);
    } else {
      document.removeEventListener('click', handleClickOutside);
    }
  }
  
  function handleClickOutside(e: MouseEvent) {
    if (colorPopupElement && !colorPopupElement.contains(e.target as Node) && 
        !(e.target as Element).closest('.color-palette-btn')) {
      showColorPopup = false;
      document.removeEventListener('click', handleClickOutside);
    }
  }
  
  function handleColorChange(type: 'header' | 'background' | 'border', color: string) {
    if (type === 'header') {
      panelStore.updatePanel(panel.id, { headerColor: color });
    } else if (type === 'background') {
      panelStore.updatePanel(panel.id, { backgroundColor: color });
    } else if (type === 'border') {
      panelStore.updatePanel(panel.id, { borderColor: color });
    }
  }
  
  function resetColors() {
    panelStore.updatePanel(panel.id, {
      headerColor: '#636363',
      backgroundColor: '#2a2a2a',
      borderColor: '#444'
    });
  }
  
  function handleDragStart(e: DragEvent) {
    e.dataTransfer!.effectAllowed = 'move';
    e.dataTransfer!.setData('panelId', panel.id);
    
    // Create custom drag image
    const dragImage = document.createElement('div');
    dragImage.style.cssText = 'background: #333; color: white; padding: 8px 12px; border-radius: 4px;';
    dragImage.textContent = panel.title;
    document.body.appendChild(dragImage);
    e.dataTransfer!.setDragImage(dragImage, 0, 0);
    setTimeout(() => document.body.removeChild(dragImage), 0);
    
    dispatch('dragstart', { panelId: panel.id });
  }
  
  function handleDragEnd() {
    dispatch('dragend');
  }
  
  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    e.dataTransfer!.dropEffect = 'move';
    
    // Determine drop zone based on position
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const relativeX = x / rect.width;
    
    if (relativeX < 0.25) {
      dropZone = 'before';
    } else if (relativeX > 0.75) {
      dropZone = 'after';
    } else {
      dropZone = 'center';
    }
  }
  
  function handleDragLeave() {
    dropZone = null;
  }
  
  function handleDrop(e: DragEvent) {
    e.preventDefault();
    const draggedPanelId = e.dataTransfer!.getData('panelId');
    
    if (draggedPanelId && draggedPanelId !== panel.id) {
      const position = dropZone === 'center' ? 'split' : dropZone;
      dispatch('drop', { 
        rowId: `row-${panel.rowIndex}`,
        targetPanelId: panel.id,
        position
      });
    }
    
    dropZone = null;
  }
  
  // Horizontal resize (width)
  function handleHorizontalResizeStart(e: MouseEvent | TouchEvent, side: 'left' | 'right') {
    isResizing = true;
    resizeDirection = 'horizontal';
    resizeSide = side;
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    resizeStartX = clientX;
    resizeStartWidth = panel.widthPercent || 100;
    
    // Store reference to panel element if not already set
    if (!panelElement) {
      panelElement = (e.currentTarget as HTMLElement).parentElement as HTMLElement;
    }
    
    if ('touches' in e) {
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleTouchEnd);
    } else {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    e.preventDefault();
  }
  
  // Vertical resize (height)
  function handleVerticalResizeStart(e: MouseEvent | TouchEvent, side: 'top' | 'bottom') {
    isResizing = true;
    resizeDirection = 'vertical';
    resizeSide = side;
    
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    resizeStartY = clientY;
    resizeStartHeight = panel.heightPixels || 400;
    
    if ('touches' in e) {
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleTouchEnd);
    } else {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    e.preventDefault();
  }
  
  function handleMouseMove(e: MouseEvent) {
    if (!isResizing) return;
    
    if (resizeDirection === 'horizontal') {
      // Get the row container for accurate width calculations
      const rowElement = panelElement?.closest('.row') as HTMLElement;
      if (!rowElement) return;
      
      const containerWidth = rowElement.clientWidth;
      const containerRect = rowElement.getBoundingClientRect();
      
      if (resizeSide === 'right') {
        // Calculate new width based on mouse position relative to panel left edge
        const panelRect = panelElement.getBoundingClientRect();
        const panelLeft = panelRect.left - containerRect.left;
        const newWidthPx = e.clientX - containerRect.left - panelLeft;
        const newWidthPercent = (newWidthPx / containerWidth) * 100;
        
        // Constrain width to reasonable bounds (10% min)
        const finalWidth = Math.max(10, newWidthPercent);
        
        dispatch('resize', { 
          panelId: panel.id, 
          newWidth: finalWidth
        });
      } else if (resizeSide === 'left') {
        // For left resize, just adjust this panel's width
        const deltaX = resizeStartX - e.clientX; // Inverted for left resize
        const deltaPercent = (deltaX / containerWidth) * 100;
        const newWidth = Math.max(10, resizeStartWidth + deltaPercent);
        
        dispatch('resize', { 
          panelId: panel.id, 
          newWidth,
          isLeftResize: true
        });
      }
    } else if (resizeDirection === 'vertical') {
      if (resizeSide === 'bottom') {
        const deltaY = e.clientY - resizeStartY;
        const newHeight = Math.max(150, Math.min(window.innerHeight * 0.8, resizeStartHeight + deltaY));
        
        dispatch('resize', { 
          panelId: panel.id, 
          newHeight
        });
      } else if (resizeSide === 'top') {
        const deltaY = e.clientY - resizeStartY;
        const newHeight = Math.max(150, Math.min(window.innerHeight * 0.8, resizeStartHeight - deltaY));
        
        dispatch('resize', { 
          panelId: panel.id, 
          newHeight,
          moveTop: true,
          deltaY
        });
      }
    }
  }
  
  function handleMouseUp() {
    isResizing = false;
    resizeDirection = null;
    resizeSide = null;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  }
  
  // Touch event handlers
  function handleTouchMove(e: TouchEvent) {
    if (!isResizing || !e.touches[0]) return;
    
    const touch = e.touches[0];
    
    if (resizeDirection === 'horizontal') {
      // Get the row container for accurate width calculations
      const rowElement = panelElement?.closest('.row') as HTMLElement;
      if (!rowElement) return;
      
      const containerWidth = rowElement.clientWidth;
      const containerRect = rowElement.getBoundingClientRect();
      
      if (resizeSide === 'right') {
        const panelRect = panelElement.getBoundingClientRect();
        const panelLeft = panelRect.left - containerRect.left;
        const newWidthPx = touch.clientX - containerRect.left - panelLeft;
        const newWidthPercent = (newWidthPx / containerWidth) * 100;
        const finalWidth = Math.max(10, newWidthPercent);
        
        dispatch('resize', { 
          panelId: panel.id, 
          newWidth: finalWidth
        });
      } else if (resizeSide === 'left') {
        const deltaX = resizeStartX - touch.clientX;
        const deltaPercent = (deltaX / containerWidth) * 100;
        const newWidth = Math.max(10, resizeStartWidth + deltaPercent);
        
        dispatch('resize', { 
          panelId: panel.id, 
          newWidth,
          isLeftResize: true
        });
      }
    } else if (resizeDirection === 'vertical') {
      if (resizeSide === 'bottom') {
        const deltaY = touch.clientY - resizeStartY;
        const newHeight = Math.max(150, Math.min(window.innerHeight * 0.8, resizeStartHeight + deltaY));
        
        dispatch('resize', { 
          panelId: panel.id, 
          newHeight
        });
      } else if (resizeSide === 'top') {
        const deltaY = touch.clientY - resizeStartY;
        const newHeight = Math.max(150, Math.min(window.innerHeight * 0.8, resizeStartHeight - deltaY));
        
        dispatch('resize', { 
          panelId: panel.id, 
          newHeight,
          moveTop: true,
          deltaY
        });
      }
    }
    
    e.preventDefault();
  }
  
  function handleTouchEnd() {
    isResizing = false;
    resizeDirection = null;
    resizeSide = null;
    document.removeEventListener('touchmove', handleTouchMove);
    document.removeEventListener('touchend', handleTouchEnd);
  }
  
  function handleOpen(event: CustomEvent) {
    console.log('RowPanel handleOpen:', event.detail);
    dispatch('open', event.detail);
  }
  
  // Keyboard emulation functions for terminal
  function sendEscape() {
    if (componentInstance && (panel.type === 'terminal' || panel.type === 'claude') && componentInstance.sendInput) {
      // ESC key is ASCII 27
      componentInstance.sendInput('\x1b');
    }
  }
  
  function sendShiftTab() {
    if (componentInstance && (panel.type === 'terminal' || panel.type === 'claude') && componentInstance.sendInput) {
      // Shift+Tab is ESC[Z
      componentInstance.sendInput('\x1b[Z');
    }
  }
</script>

<div 
  class="row-panel"
  bind:this={panelElement}
  data-panel-id={panel.id}
  class:dragging={isDragging}
  class:drop-before={dropZone === 'before'}
  class:drop-after={dropZone === 'after'}
  class:drop-center={dropZone === 'center'}
  style="background-color: {panel.backgroundColor || '#2a2a2a'}; border-color: {panel.borderColor || '#444'};"
  on:dragover={handleDragOver}
  on:dragleave={handleDragLeave}
  on:drop={handleDrop}
>
  <div class="panel-header" style="background-color: {panel.headerColor || '#636363'}">
    <!-- Drag handle -->
    <div
      class="drag-handle"
      draggable="true"
      on:dragstart={handleDragStart}
      on:dragend={handleDragEnd}
      title="Drag to reorder"
    >
      <GripVertical size={16} />
    </div>
    
    <h3 class="panel-title">{panel.title}</h3>
    
    <div class="panel-controls">
      <!-- Color palette button -->
      <div class="color-palette-container">
        <button 
          class="control-btn color-palette-btn {showColorPopup ? 'active' : ''}"
          on:click={toggleColorPopup}
          title="Change panel colors"
        >
          <Palette size={16} />
        </button>
        
        {#if showColorPopup}
          <!-- Mobile backdrop -->
          <div class="color-popup-backdrop" on:click={() => showColorPopup = false}></div>
          <div class="color-popup" bind:this={colorPopupElement}>
            <div class="color-popup-header">
              <h4>Panel Colors</h4>
              <button 
                class="reset-btn"
                on:click={resetColors}
                title="Reset to default colors"
              >
                Reset
              </button>
            </div>
            
            <div class="color-options">
              <!-- Header Color -->
              <div class="color-option">
                <label for="header-color-{panel.id}">Header</label>
                <div class="color-input-wrapper">
                  <input
                    id="header-color-{panel.id}"
                    bind:this={headerColorInput}
                    type="color"
                    value={panel.headerColor || '#636363'}
                    on:input={(e) => handleColorChange('header', e.currentTarget.value)}
                    class="color-picker-input"
                  />
                  <button 
                    class="color-preview"
                    style="background-color: {panel.headerColor || '#636363'};"
                    on:click={() => headerColorInput?.click()}
                    type="button"
                    aria-label="Choose header color"
                  ></button>
                </div>
              </div>
              
              <!-- Background Color -->
              <div class="color-option">
                <label for="bg-color-{panel.id}">Background</label>
                <div class="color-input-wrapper">
                  <input
                    id="bg-color-{panel.id}"
                    bind:this={backgroundColorInput}
                    type="color"
                    value={panel.backgroundColor || '#2a2a2a'}
                    on:input={(e) => handleColorChange('background', e.currentTarget.value)}
                    class="color-picker-input"
                  />
                  <button 
                    class="color-preview"
                    style="background-color: {panel.backgroundColor || '#2a2a2a'};"
                    on:click={() => backgroundColorInput?.click()}
                    type="button"
                    aria-label="Choose background color"
                  ></button>
                </div>
              </div>
              
              <!-- Border Color -->
              <div class="color-option">
                <label for="border-color-{panel.id}">Border</label>
                <div class="color-input-wrapper">
                  <input
                    id="border-color-{panel.id}"
                    bind:this={borderColorInput}
                    type="color"
                    value={panel.borderColor || '#444'}
                    on:input={(e) => handleColorChange('border', e.currentTarget.value)}
                    class="color-picker-input"
                  />
                  <button 
                    class="color-preview"
                    style="background-color: {panel.borderColor || '#444'};"
                    on:click={() => borderColorInput?.click()}
                    type="button"
                    aria-label="Choose border color"
                  ></button>
                </div>
              </div>
            </div>
          </div>
        {/if}
      </div>
      
      <!-- Keyboard emulation buttons for terminal panels -->
      {#if panel.type === 'terminal' || panel.type === 'claude'}
        <div class="keyboard-buttons">
          <button 
            class="control-btn keyboard-btn"
            on:click={sendEscape}
            title="Send ESC key"
          >
            <span class="key-label">ESC</span>
          </button>
          <button 
            class="control-btn keyboard-btn"
            on:click={sendShiftTab}
            title="Send Shift+Tab"
          >
            <span class="key-label">⇧⇥</span>
          </button>
        </div>
      {/if}
      
      <!-- Close button -->
      {#if !panel.persistent}
        <button 
          class="control-btn close-btn"
          on:click={handleClose}
          title="Close panel"
        >
          <X size={16} />
        </button>
      {/if}
    </div>
  </div>
  
  <div class="panel-content">
    {#if component}
      {#key panel.type + panel.id}
        {#if panel.type === 'terminal' || panel.type === 'claude'}
          <svelte:component 
            this={component} 
            bind:this={componentInstance}
            {websocketUrl}
            panelId={panel.id}
            autoLaunchClaude={panel.type === 'claude'}
          />
        {:else if panel.type === 'fileExplorer' || panel.type === 'file-explorer'}
          <svelte:component 
            this={component} 
            panelId={panel.id}
            {...panel.content}
            on:open={handleOpen}
          />
        {:else}
          <svelte:component 
            this={component} 
            panelId={panel.id}
            {...panel.content}
          />
        {/if}
      {/key}
    {/if}
  </div>
  
  <!-- Resize handles -->
  <div 
    class="resize-handle resize-left"
    on:mousedown={(e) => handleHorizontalResizeStart(e, 'left')}
    on:touchstart={(e) => handleHorizontalResizeStart(e, 'left')}
    title="Resize width"
    role="separator"
    aria-orientation="vertical"
    tabindex="0"
  ></div>
  <div 
    class="resize-handle resize-right"
    on:mousedown={(e) => handleHorizontalResizeStart(e, 'right')}
    on:touchstart={(e) => handleHorizontalResizeStart(e, 'right')}
    title="Resize width"
    role="separator"
    aria-orientation="vertical"
    tabindex="0"
  ></div>
  <div 
    class="resize-handle resize-top"
    on:mousedown={(e) => handleVerticalResizeStart(e, 'top')}
    on:touchstart={(e) => handleVerticalResizeStart(e, 'top')}
    title="Resize height"
    role="separator"
    aria-orientation="horizontal"
    tabindex="0"
  ></div>
  <div 
    class="resize-handle resize-bottom"
    on:mousedown={(e) => handleVerticalResizeStart(e, 'bottom')}
    on:touchstart={(e) => handleVerticalResizeStart(e, 'bottom')}
    title="Resize height"
    role="separator"
    aria-orientation="horizontal"
    tabindex="0"
  ></div>
</div>

<style>
  .row-panel {
    position: relative;
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    background-color: var(--panel-bg, #2d2d30);
    border: 1px solid var(--panel-border, #3e3e42);
    overflow: hidden;
    transition: opacity 0.2s, transform 0.2s;
    box-sizing: border-box;
  }
  
  .row-panel.dragging {
    opacity: 0.5;
  }
  
  .row-panel.drop-before::before,
  .row-panel.drop-after::after {
    content: '';
    position: absolute;
    top: 0;
    bottom: 0;
    width: 4px;
    background-color: var(--accent-color, #0e639c);
    z-index: 10;
  }
  
  .row-panel.drop-before::before {
    left: -2px;
  }
  
  .row-panel.drop-after::after {
    right: -2px;
  }
  
  .row-panel.drop-center {
    box-shadow: inset 0 0 0 3px var(--accent-color, #0e639c);
  }
  
  .panel-header {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 2px 6px;
    background-color: #636363;
    border-bottom: 1px solid var(--panel-border, #3e3e42);
    flex-shrink: 0;
    height: 28px;
  }
  
  .drag-handle {
    cursor: move;
    color: var(--panel-control-color, #858585);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2px;
    border-radius: 3px;
    transition: all 0.2s;
  }
  
  .drag-handle:hover {
    background-color: rgba(255, 255, 255, 0.1);
    color: var(--panel-title-color, #cccccc);
  }
  
  .panel-title {
    margin: 0;
    font-size: 12px;
    font-weight: 500;
    color: var(--panel-title-color, #cccccc);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    flex: 1;
  }
  
  .panel-controls {
    display: flex;
    gap: 6px;
    align-items: center;
    margin-left: auto;
  }
  
  .control-btn {
    background: none;
    border: none;
    color: var(--panel-control-color, #858585);
    cursor: pointer;
    padding: 2px;
    border-radius: 3px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
    width: 20px;
    height: 20px;
  }
  
  .control-btn:hover {
    background-color: rgba(255, 255, 255, 0.1);
    color: var(--panel-title-color, #cccccc);
  }
  
  /* Color palette button and popup */
  .color-palette-container {
    position: relative;
  }
  
  .color-palette-btn {
    transition: all 0.2s;
  }
  
  .color-palette-btn.active {
    background-color: rgba(255, 255, 255, 0.2);
    color: white;
  }
  
  .color-popup {
    position: absolute;
    top: 100%;
    right: 0;
    margin-top: 4px;
    background-color: var(--popup-bg, #1e1e1e);
    border: 1px solid var(--popup-border, #3e3e42);
    border-radius: 6px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    padding: 12px;
    z-index: 1000;
    min-width: 220px;
  }
  
  .color-popup-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
    padding-bottom: 8px;
    border-bottom: 1px solid var(--popup-border, #3e3e42);
  }
  
  .color-popup-header h4 {
    margin: 0;
    font-size: 13px;
    font-weight: 600;
    color: var(--text-primary, #cccccc);
  }
  
  .reset-btn {
    background: none;
    border: 1px solid var(--popup-border, #3e3e42);
    color: var(--text-secondary, #858585);
    font-size: 11px;
    padding: 2px 8px;
    border-radius: 3px;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .reset-btn:hover {
    background-color: rgba(255, 255, 255, 0.1);
    color: var(--text-primary, #cccccc);
    border-color: var(--text-secondary, #858585);
  }
  
  .color-options {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  
  .color-option {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }
  
  .color-option label {
    font-size: 12px;
    color: var(--text-secondary, #858585);
    min-width: 70px;
  }
  
  .color-input-wrapper {
    position: relative;
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1;
  }
  
  .color-picker-input {
    position: absolute;
    width: 1px;
    height: 1px;
    opacity: 0;
    pointer-events: none;
  }
  
  .color-preview {
    width: 100%;
    height: 28px;
    border: 1px solid var(--popup-border, #3e3e42);
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s;
    position: relative;
    overflow: hidden;
    padding: 0;
    background: none;
  }
  
  .color-preview:hover {
    border-color: var(--accent-color, #0e639c);
    transform: scale(1.02);
  }
  
  .color-preview::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(45deg, rgba(255,255,255,0.1) 0%, transparent 100%);
    opacity: 0;
    transition: opacity 0.2s;
  }
  
  .color-preview:hover::after {
    opacity: 1;
  }
  
  /* Mobile backdrop */
  .color-popup-backdrop {
    display: none;
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 999;
  }
  
  @media (hover: none) and (pointer: coarse) {
    .color-popup-backdrop {
      display: block;
    }
  }
  
  .close-btn:hover {
    background-color: var(--panel-close-hover-bg, #f14c4c);
    color: white;
  }
  
  /* Keyboard emulation buttons */
  .keyboard-buttons {
    display: flex;
    gap: 2px;
    align-items: center;
  }
  
  .keyboard-btn {
    width: auto;
    min-width: 28px;
    padding: 2px 6px;
    font-size: 11px;
    font-weight: 600;
    background-color: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
  }
  
  .keyboard-btn:hover {
    background-color: rgba(255, 255, 255, 0.15);
    border-color: rgba(255, 255, 255, 0.2);
  }
  
  .keyboard-btn:active {
    background-color: var(--accent-color, #0e639c);
    color: white;
  }
  
  .key-label {
    font-family: monospace;
    font-size: 10px;
    line-height: 1;
  }
  
  
  /* Mobile-specific improvements */
  @media (hover: none) and (pointer: coarse) {
    .color-popup {
      position: fixed;
      top: 50%;
      left: 50%;
      right: auto;
      transform: translate(-50%, -50%);
      width: 90%;
      max-width: 320px;
      padding: 16px;
    }
    
    .color-option {
      gap: 16px;
    }
    
    .color-preview {
      height: 36px;
    }
    
    .keyboard-btn {
      min-width: 36px;
      height: 24px;
      padding: 4px 8px;
      font-size: 12px;
    }
    
    .keyboard-buttons {
      gap: 4px;
    }
  }
  
  .panel-content {
    flex: 1;
    overflow: hidden;
    min-height: 0;
  }
  
  /* Resize handles */
  .resize-handle {
    position: absolute;
    background: transparent;
    transition: background-color 0.2s;
    z-index: 10;
  }
  
  .resize-handle:hover {
    background-color: var(--accent-color, #0e639c);
  }
  
  .resize-handle::after {
    content: '';
    position: absolute;
    background: transparent;
  }
  
  .resize-left {
    top: 0;
    left: -4px;
    bottom: 0;
    width: 8px;
    cursor: ew-resize;
  }
  
  .resize-left::after {
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 2px;
    height: 30px;
    background: var(--border-color);
    opacity: 0;
    transition: opacity 0.2s;
  }
  
  .resize-left:hover::after {
    opacity: 1;
  }
  
  .resize-right {
    top: 0;
    right: -4px;
    bottom: 0;
    width: 8px;
    cursor: ew-resize;
  }
  
  .resize-right::after {
    top: 50%;
    right: 50%;
    transform: translate(50%, -50%);
    width: 2px;
    height: 30px;
    background: var(--border-color);
    opacity: 0;
    transition: opacity 0.2s;
  }
  
  .resize-right:hover::after {
    opacity: 1;
  }
  
  .resize-top {
    left: 0;
    right: 0;
    top: -4px;
    height: 8px;
    cursor: ns-resize;
  }
  
  .resize-bottom {
    left: 0;
    right: 0;
    bottom: -4px;
    height: 8px;
    cursor: ns-resize;
  }
  
  /* Touch-friendly resize handles */
  @media (pointer: coarse) {
    .resize-handle {
      /* Increase touch target size */
      width: calc(var(--resize-handle-size) * 1.5);
      height: calc(var(--resize-handle-size) * 1.5);
    }
    
    .resize-left {
      left: calc(var(--resize-handle-size) * -0.75);
      width: var(--resize-handle-size);
    }
    
    .resize-right {
      right: calc(var(--resize-handle-size) * -0.75);
      width: var(--resize-handle-size);
    }
    
    .resize-top {
      top: calc(var(--resize-handle-size) * -0.75);
      height: var(--resize-handle-size);
    }
    
    .resize-bottom {
      bottom: calc(var(--resize-handle-size) * -0.75);
      height: var(--resize-handle-size);
    }
    
    .resize-handle::after {
      opacity: 0.5; /* Always show on touch devices */
    }
  }
  
  /* Responsive optimizations */
  @media (max-width: 768px) {
    .panel-header {
      padding: var(--spacing-xs) var(--spacing-sm);
      height: 36px;
      font-size: var(--font-size-sm);
    }
    
    .panel-title {
      font-size: var(--font-size-sm);
    }
    
    .control-btn {
      width: 28px;
      height: 28px;
      padding: 4px;
    }
    
    .drag-handle {
      padding: 4px;
    }
    
    .keyboard-btn {
      min-width: 32px;
      height: 26px;
      padding: 3px 6px;
      font-size: 11px;
    }
    
    .keyboard-buttons {
      gap: 3px;
    }
    
    /* Hide resize handles on mobile as panels stack */
    .resize-handle {
      display: none;
    }
  }
  
  /* Container queries for responsive panels */
  @container (max-width: 400px) {
    .panel-header {
      padding: var(--spacing-xs);
      gap: var(--spacing-xs);
    }
    
    .panel-title {
      font-size: var(--font-size-xs);
    }
    
    /* Keep color palette button visible even on small panels */
    .color-palette-btn {
      min-width: 20px;
    }
  }
  
  /* High contrast mode support */
  @media (prefers-contrast: high) {
    .panel-header {
      border: 1px solid var(--border-color);
    }
    
    .resize-handle::after {
      background: var(--accent-color);
    }
  }
</style>