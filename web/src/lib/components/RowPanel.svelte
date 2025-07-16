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
  let dropZone: 'before' | 'after' | 'center' | null = null;
  
  // Resize state
  let isResizing = false;
  let resizeDirection: 'horizontal' | 'vertical' | null = null;
  let resizeSide: 'left' | 'right' | 'top' | 'bottom' | null = null;
  let resizeStartX = 0;
  let resizeStartY = 0;
  let resizeStartWidth = 0;
  let resizeStartHeight = 0;
  let resizeStartLeft = 0;
  
  function handleClose() {
    dispatch('close', { panelId: panel.id });
  }
  
  function toggleColorPicker() {
    showColorPicker = !showColorPicker;
    if (showColorPicker && colorInput) {
      setTimeout(() => colorInput?.click(), 0);
    }
  }
  
  function handleColorChange(e: Event) {
    const color = (e.target as HTMLInputElement).value;
    panelStore.updatePanel(panel.id, { headerColor: color });
    showColorPicker = false;
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
  function handleHorizontalResizeStart(e: MouseEvent, side: 'left' | 'right') {
    isResizing = true;
    resizeDirection = 'horizontal';
    resizeSide = side;
    resizeStartX = e.clientX;
    resizeStartWidth = panel.widthPercent || 100;
    
    // Get current position for left-side resizing
    const panelElement = e.currentTarget.parentElement as HTMLElement;
    if (panelElement) {
      const rect = panelElement.getBoundingClientRect();
      resizeStartLeft = rect.left;
    }
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    e.preventDefault();
  }
  
  // Vertical resize (height)
  function handleVerticalResizeStart(e: MouseEvent, side: 'top' | 'bottom') {
    isResizing = true;
    resizeDirection = 'vertical';
    resizeSide = side;
    resizeStartY = e.clientY;
    resizeStartHeight = panel.heightPixels || 400;
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    e.preventDefault();
  }
  
  function handleMouseMove(e: MouseEvent) {
    if (!isResizing) return;
    
    if (resizeDirection === 'horizontal') {
      const containerWidth = document.querySelector('.row')?.clientWidth || window.innerWidth;
      
      if (resizeSide === 'right') {
        const deltaX = e.clientX - resizeStartX;
        const deltaPercent = (deltaX / containerWidth) * 100;
        const newWidth = Math.max(10, Math.min(90, resizeStartWidth + deltaPercent));
        
        dispatch('resize', { 
          panelId: panel.id, 
          newWidth
        });
      } else if (resizeSide === 'left') {
        // For left resize, we need to handle both position and width
        const deltaX = e.clientX - resizeStartX;
        const deltaPercent = (deltaX / containerWidth) * 100;
        const newWidth = Math.max(10, Math.min(90, resizeStartWidth - deltaPercent));
        
        dispatch('resize', { 
          panelId: panel.id, 
          newWidth,
          moveLeft: true,
          deltaPercent
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
</script>

<div 
  class="row-panel"
  class:dragging={isDragging}
  class:drop-before={dropZone === 'before'}
  class:drop-after={dropZone === 'after'}
  class:drop-center={dropZone === 'center'}
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
      <!-- Color picker -->
      <button 
        class="control-btn color-btn"
        on:click={toggleColorPicker}
        title="Change header color"
      >
        <Palette size={14} />
      </button>
      <input
        bind:this={colorInput}
        type="color"
        class="color-input"
        value={panel.headerColor || '#636363'}
        on:change={handleColorChange}
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
          {...panel.content}
        />
      {:else}
        <svelte:component 
          this={component} 
          {...panel.content}
        />
      {/if}
    {/if}
  </div>
  
  <!-- Resize handles -->
  <div 
    class="resize-handle resize-left"
    on:mousedown={(e) => handleHorizontalResizeStart(e, 'left')}
    title="Resize width"
  ></div>
  <div 
    class="resize-handle resize-right"
    on:mousedown={(e) => handleHorizontalResizeStart(e, 'right')}
    title="Resize width"
  ></div>
  <div 
    class="resize-handle resize-top"
    on:mousedown={(e) => handleVerticalResizeStart(e, 'top')}
    title="Resize height"
  ></div>
  <div 
    class="resize-handle resize-bottom"
    on:mousedown={(e) => handleVerticalResizeStart(e, 'bottom')}
    title="Resize height"
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
  
  .color-btn {
    width: 18px;
    height: 18px;
  }
  
  .color-btn:hover {
    background-color: rgba(255, 255, 255, 0.1);
    color: var(--accent-color, #0e639c);
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
  
  .resize-left {
    top: 0;
    left: -4px;
    bottom: 0;
    width: 8px;
    cursor: ew-resize;
  }
  
  .resize-right {
    top: 0;
    right: -4px;
    bottom: 0;
    width: 8px;
    cursor: ew-resize;
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
  
  /* Mobile optimizations */
  @media (max-width: 768px) {
    .panel-header {
      padding: 2px 4px;
      height: 32px;
    }
    
    .control-btn {
      width: 24px;
      height: 24px;
    }
  }
</style>