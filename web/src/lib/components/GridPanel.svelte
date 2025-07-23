<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { Panel } from '$lib/stores/panels';
  import { panelStore } from '$lib/stores/panels';
  import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight, X, GripVertical, Palette } from 'lucide-svelte';
  import ResizeHandle from './ResizeHandle.svelte';
  
  export let panel: Panel;
  export let component: any;
  export let websocketUrl: string = '';
  
  const dispatch = createEventDispatcher();
  
  let isDragging = false;
  let dragHandle: HTMLElement;
  let showColorPicker = false;
  let colorInput: HTMLInputElement;
  let backgroundColorInput: HTMLInputElement;
  let borderColorInput: HTMLInputElement;
  let activeColorPicker: 'header' | 'background' | 'border' | null = null;
  
  function handleMove(direction: string) {
    dispatch('move', { panelId: panel.id, direction });
  }
  
  function handleClose() {
    dispatch('close');
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
    isDragging = true;
    e.dataTransfer!.effectAllowed = 'move';
    e.dataTransfer!.setData('panelId', panel.id);
    
    // Create a custom drag image
    const dragImage = document.createElement('div');
    dragImage.style.cssText = 'background: #333; color: white; padding: 8px 12px; border-radius: 4px;';
    dragImage.textContent = panel.title;
    document.body.appendChild(dragImage);
    e.dataTransfer!.setDragImage(dragImage, 0, 0);
    setTimeout(() => document.body.removeChild(dragImage), 0);
    
    // Emit drag start event
    dispatch('dragstart', { panelId: panel.id });
  }
  
  function handleDragEnd() {
    isDragging = false;
    // Emit drag end event
    dispatch('dragend');
  }
  
  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    e.dataTransfer!.dropEffect = 'move';
  }
  
  function handleDrop(e: DragEvent) {
    e.preventDefault();
    const draggedPanelId = e.dataTransfer!.getData('panelId');
    if (draggedPanelId && draggedPanelId !== panel.id) {
      dispatch('swap', { fromId: draggedPanelId, toId: panel.id });
    }
  }
  
  function handleResize(event: CustomEvent) {
    dispatch('resize', { ...event.detail, panelId: panel.id });
  }
  
  function handleResizeStart(event: CustomEvent) {
    dispatch('resizestart', { ...event.detail, panelId: panel.id });
  }
  
  function handleResizeEnd(event: CustomEvent) {
    dispatch('resizeend', { ...event.detail, panelId: panel.id });
  }
  
  function handleOpen(event: CustomEvent) {
    dispatch('open', event.detail);
  }
</script>

<div 
  class="grid-panel"
  class:dragging={isDragging}
  style="background-color: {panel.backgroundColor || '#2a2a2a'}; border-color: {panel.borderColor || '#444'};"
  on:dragover={handleDragOver}
  on:drop={handleDrop}
>
  <div class="panel-header" style="background-color: {panel.headerColor || 'var(--panel-header-bg, #636363)'}">
    <!-- Drag handle -->
    <div
      bind:this={dragHandle}
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
      
      <!-- Arrow controls -->
      <button 
        class="control-btn"
        on:click={() => handleMove('up')}
        title="Move up"
      >
        <ChevronUp size={16} />
      </button>
      <button 
        class="control-btn"
        on:click={() => handleMove('down')}
        title="Move down"
      >
        <ChevronDown size={16} />
      </button>
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
          on:open={handleOpen}
        />
      {:else if panel.type === 'codeEditor' || panel.type === 'code-editor'}
        <svelte:component 
          this={component} 
          panelId={panel.id}
          panelConfig={panel.content}
          {...panel.content}
        />
      {:else}
        <svelte:component 
          this={component} 
          panelId={panel.id}
          panelType={panel.type}
          {...panel.content}
        />
      {/if}
    {/if}
  </div>
  
  <!-- Resize handles -->
  <ResizeHandle 
    direction="n" 
    panelId={panel.id}
    on:resize={handleResize}
    on:resizestart={handleResizeStart}
    on:resizeend={handleResizeEnd}
  />
  <ResizeHandle 
    direction="e" 
    panelId={panel.id}
    on:resize={handleResize}
    on:resizestart={handleResizeStart}
    on:resizeend={handleResizeEnd}
  />
  <ResizeHandle 
    direction="s" 
    panelId={panel.id}
    on:resize={handleResize}
    on:resizestart={handleResizeStart}
    on:resizeend={handleResizeEnd}
  />
  <ResizeHandle 
    direction="w" 
    panelId={panel.id}
    on:resize={handleResize}
    on:resizestart={handleResizeStart}
    on:resizeend={handleResizeEnd}
  />
  <ResizeHandle 
    direction="ne" 
    panelId={panel.id}
    on:resize={handleResize}
    on:resizestart={handleResizeStart}
    on:resizeend={handleResizeEnd}
  />
  <ResizeHandle 
    direction="nw" 
    panelId={panel.id}
    on:resize={handleResize}
    on:resizestart={handleResizeStart}
    on:resizeend={handleResizeEnd}
  />
  <ResizeHandle 
    direction="se" 
    panelId={panel.id}
    on:resize={handleResize}
    on:resizestart={handleResizeStart}
    on:resizeend={handleResizeEnd}
  />
  <ResizeHandle 
    direction="sw" 
    panelId={panel.id}
    on:resize={handleResize}
    on:resizestart={handleResizeStart}
    on:resizeend={handleResizeEnd}
  />
</div>

<style>
  .grid-panel {
    position: relative;
    display: flex;
    flex-direction: column;
    height: 100%;
    background-color: var(--panel-bg, #2d2d30);
    border: 1px solid var(--panel-border, #3e3e42);
    overflow: hidden;
    transition: opacity 0.2s, transform 0.2s;
  }
  
  .grid-panel.dragging {
    opacity: 0.5;
  }
  
  .grid-panel:hover {
    border-color: var(--panel-border-hover, #4e4e52);
  }
  
  .panel-header {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 2px 6px;
    background-color: var(--panel-header-bg, #636363);
    border-bottom: 1px solid var(--panel-border, #3e3e42);
    flex-shrink: 0;
  }
  
  .drag-handle {
    cursor: move;
    color: var(--panel-control-color, rgb(210, 210, 210));
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2px;
    border-radius: 3px;
    transition: all 0.2s;
  }
  
  .drag-handle:hover {
    background-color: var(--panel-control-hover-bg, rgba(255, 255, 255, 0.1));
    color: var(--panel-title-color, rgb(210, 210, 210));
  }
  
  .panel-title {
    margin: 0;
    font-size: 12px;
    font-weight: 500;
    color: var(--panel-title-color, rgb(210, 210, 210));
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
    color: var(--panel-control-color, rgb(210, 210, 210));
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
    background-color: var(--panel-control-hover-bg, rgba(255, 255, 255, 0.1));
    color: var(--panel-title-color, rgb(210, 210, 210));
  }
  
  .control-btn:active {
    background-color: var(--panel-control-active-bg, rgba(255, 255, 255, 0.2));
  }
  
  .close-btn:hover {
    background-color: var(--panel-close-hover-bg, #f14c4c);
    color: white;
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
  
  .panel-content {
    flex: 1;
    overflow: hidden;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }
  
  /* Ensure child components fill the space */
  .panel-content > :global(*) {
    flex: 1;
    min-height: 0;
    height: 100%;
  }
  
  /* Mobile optimizations */
  @media (max-width: 768px) {
    .panel-header {
      padding: 2px 4px;
    }
    
    .control-btn {
      padding: 1px;
      width: 22px;
      height: 22px;
    }
    
    .color-btn {
      width: 18px;
      height: 18px;
    }
  }
  
  /* Touch-friendly sizes */
  @media (hover: none) {
    .control-btn {
      padding: 8px;
      min-width: 40px;
      min-height: 40px;
    }
  }
</style>