<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { Panel } from '$lib/stores/panels';
  import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight, X, GripVertical } from 'lucide-svelte';
  import ResizeHandle from './ResizeHandle.svelte';
  
  export let panel: Panel;
  export let component: any;
  export let websocketUrl: string = '';
  
  const dispatch = createEventDispatcher();
  
  let isDragging = false;
  let dragHandle: HTMLElement;
  
  function handleMove(direction: string) {
    dispatch('move', { panelId: panel.id, direction });
  }
  
  function handleClose() {
    dispatch('close');
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
</script>

<div 
  class="grid-panel"
  class:dragging={isDragging}
  on:dragover={handleDragOver}
  on:drop={handleDrop}
>
  <div class="panel-header">
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
    direction="se" 
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
    padding: 4px 8px;
    background-color: var(--panel-header-bg, #1a1a1a);
    border-bottom: 1px solid var(--panel-border, #3e3e42);
    flex-shrink: 0;
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
    background-color: var(--panel-control-hover-bg, rgba(255, 255, 255, 0.1));
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
    background-color: var(--panel-control-hover-bg, rgba(255, 255, 255, 0.1));
    color: var(--panel-title-color, #cccccc);
  }
  
  .control-btn:active {
    background-color: var(--panel-control-active-bg, rgba(255, 255, 255, 0.2));
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
  
  /* Mobile optimizations */
  @media (max-width: 768px) {
    .panel-header {
      padding: 3px 6px;
    }
    
    .control-btn {
      padding: 2px;
      width: 24px;
      height: 24px;
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