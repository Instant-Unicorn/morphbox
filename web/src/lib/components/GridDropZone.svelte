<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  
  export let row: number;
  export let col: number;
  export let isDragging: boolean = false;
  
  const dispatch = createEventDispatcher();
  
  let isHovered = false;
  
  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    e.dataTransfer!.dropEffect = 'move';
    isHovered = true;
  }
  
  function handleDragLeave() {
    isHovered = false;
  }
  
  function handleDrop(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    isHovered = false;
    const panelId = e.dataTransfer!.getData('panelId');
    if (panelId) {
      dispatch('drop', { row, col, panelId });
    }
  }
</script>

<div 
  class="grid-drop-zone"
  class:dragging={isDragging}
  class:hovered={isHovered}
  on:dragover={handleDragOver}
  on:dragleave={handleDragLeave}
  on:drop={handleDrop}
  role="region"
  aria-label="Empty grid cell"
>
  {#if isDragging}
    <div class="drop-indicator">
      <span>Drop here</span>
    </div>
  {/if}
</div>

<style>
  .grid-drop-zone {
    position: relative;
    width: 100%;
    height: 100%;
    min-height: 100px;
    background-color: var(--bg-secondary, #252526);
    border: 1px dashed transparent;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .grid-drop-zone.dragging {
    border-color: var(--panel-border, #3e3e42);
    background-color: rgba(255, 255, 255, 0.02);
  }
  
  .grid-drop-zone.hovered {
    background-color: var(--drop-zone-hover, rgba(14, 99, 156, 0.3));
    border-color: var(--accent-color, #0e639c);
    border-width: 2px;
  }
  
  .drop-indicator {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
  }
  
  .drop-indicator span {
    padding: 4px 8px;
    background-color: var(--panel-bg, #2d2d30);
    border: 1px solid var(--panel-border, #3e3e42);
    border-radius: 4px;
    font-size: 12px;
    color: var(--text-secondary, #858585);
  }
  
  /* Mobile responsive */
  @media (max-width: 768px) {
    .grid-drop-zone {
      min-height: 80px;
    }
  }
</style>