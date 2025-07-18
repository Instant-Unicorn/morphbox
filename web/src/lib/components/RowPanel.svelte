<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { Panel } from '$lib/stores/panels';
  import { panelStore } from '$lib/stores/panels';
  import { X, GripVertical, Palette } from 'lucide-svelte';
  
  export let panel: Panel;
  export let component: any;
  export let websocketUrl: string = '';
  export let isDragging: boolean = false;
  
  const dispatch = createEventDispatcher();
  
  let showColorPicker = false;
  let colorInput: HTMLInputElement;
  let backgroundColorInput: HTMLInputElement;
  let borderColorInput: HTMLInputElement;
  let activeColorPicker: 'header' | 'background' | 'border' | null = null;
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
  
  function handleClose() {
    dispatch('close', { panelId: panel.id });
  }
  
  function toggleColorPicker(type: 'header' | 'background' | 'border') {
    activeColorPicker = activeColorPicker === type ? null : type;
    showColorPicker = activeColorPicker !== null;
    
    if (showColorPicker) {
      setTimeout(() => {
        if (type === 'header' && colorInput) colorInput.click();
        else if (type === 'background' && backgroundColorInput) backgroundColorInput.click();
        else if (type === 'border' && borderColorInput) borderColorInput.click();
      }, 0);
    }
  }
  
  function handleColorChange(e: Event, type: 'header' | 'background' | 'border') {
    const color = (e.target as HTMLInputElement).value;
    
    if (type === 'header') {
      panelStore.updatePanel(panel.id, { headerColor: color });
    } else if (type === 'background') {
      panelStore.updatePanel(panel.id, { backgroundColor: color });
    } else if (type === 'border') {
      panelStore.updatePanel(panel.id, { borderColor: color });
    }
    
    showColorPicker = false;
    activeColorPicker = null;
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
    dispatch('open', event.detail);
  }
</script>

<div 
  class="row-panel"
  bind:this={panelElement}
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
      <!-- Color pickers -->
      <div class="color-picker-group">
        <button 
          class="control-btn color-btn {activeColorPicker === 'header' ? 'active' : ''}"
          on:click={() => toggleColorPicker('header')}
          title="Change header color"
          style="background-color: {panel.headerColor || '#636363'};"
        >
          <span class="color-label">H</span>
        </button>
        <button 
          class="control-btn color-btn {activeColorPicker === 'background' ? 'active' : ''}"
          on:click={() => toggleColorPicker('background')}
          title="Change background color"
          style="background-color: {panel.backgroundColor || '#2a2a2a'};"
        >
          <span class="color-label">B</span>
        </button>
        <button 
          class="control-btn color-btn {activeColorPicker === 'border' ? 'active' : ''}"
          on:click={() => toggleColorPicker('border')}
          title="Change border color"
          style="background-color: {panel.borderColor || '#444'};"
        >
          <span class="color-label">E</span>
        </button>
      </div>
      
      <!-- Hidden color inputs -->
      <input
        bind:this={colorInput}
        type="color"
        class="color-input"
        value={panel.headerColor || '#636363'}
        on:change={(e) => handleColorChange(e, 'header')}
        style="display: none;"
      />
      <input
        bind:this={backgroundColorInput}
        type="color"
        class="color-input"
        value={panel.backgroundColor || '#2a2a2a'}
        on:change={(e) => handleColorChange(e, 'background')}
        style="display: none;"
      />
      <input
        bind:this={borderColorInput}
        type="color"
        class="color-input"
        value={panel.borderColor || '#444'}
        on:change={(e) => handleColorChange(e, 'border')}
        style="display: none;"
      />
      
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
      {#if panel.type === 'terminal' || panel.type === 'claude'}
        <svelte:component 
          this={component} 
          {websocketUrl}
          panelId={panel.id}
          {...panel.content}
        />
      {:else if panel.type === 'fileExplorer' || panel.type === 'file-explorer'}
        <svelte:component 
          this={component} 
          panelId={panel.id}
          {...panel.content}
        />
      {:else}
        <svelte:component 
          this={component} 
          panelId={panel.id}
          {...panel.content}
        />
      {/if}
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
    gap: 4px;
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
  
  .color-picker-group {
    display: flex;
    gap: 2px;
    align-items: center;
  }
  
  .color-btn {
    width: 18px;
    height: 18px;
    border: 1px solid rgba(255, 255, 255, 0.2);
    position: relative;
    overflow: hidden;
  }
  
  .color-btn.active {
    border-color: var(--accent-color, #0e639c);
    box-shadow: 0 0 3px var(--accent-color, #0e639c);
  }
  
  .color-btn:hover {
    border-color: rgba(255, 255, 255, 0.4);
    transform: scale(1.1);
  }
  
  .color-label {
    font-size: 10px;
    font-weight: bold;
    color: white;
    text-shadow: 0 0 2px rgba(0, 0, 0, 0.8);
    position: relative;
    z-index: 1;
  }
  
  .close-btn:hover {
    background-color: var(--panel-close-hover-bg, #f14c4c);
    color: white;
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
    
    /* Hide color picker on very small panels */
    .color-btn {
      display: none;
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