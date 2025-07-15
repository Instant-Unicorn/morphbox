<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  
  export let orientation: 'horizontal' | 'vertical' = 'horizontal';
  export let disabled: boolean = false;
  
  const dispatch = createEventDispatcher();
  
  let isDragging = false;
  let startPos = { x: 0, y: 0 };
  let handleElement: HTMLDivElement;
  
  function handleMouseDown(e: MouseEvent) {
    if (disabled) return;
    
    isDragging = true;
    startPos = { x: e.clientX, y: e.clientY };
    
    // Capture mouse events globally
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    // Prevent text selection while dragging
    e.preventDefault();
    
    dispatch('dragstart', { x: e.clientX, y: e.clientY });
  }
  
  function handleMouseMove(e: MouseEvent) {
    if (!isDragging) return;
    
    const delta = orientation === 'horizontal' 
      ? e.clientX - startPos.x 
      : e.clientY - startPos.y;
    
    dispatch('drag', { 
      delta,
      x: e.clientX, 
      y: e.clientY 
    });
  }
  
  function handleMouseUp(e: MouseEvent) {
    if (!isDragging) return;
    
    isDragging = false;
    
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    
    dispatch('dragend', { x: e.clientX, y: e.clientY });
  }
  
  function handleTouchStart(e: TouchEvent) {
    if (disabled) return;
    
    const touch = e.touches[0];
    startPos = { x: touch.clientX, y: touch.clientY };
    isDragging = true;
    
    e.preventDefault();
    dispatch('dragstart', { x: touch.clientX, y: touch.clientY });
  }
  
  function handleTouchMove(e: TouchEvent) {
    if (!isDragging) return;
    
    const touch = e.touches[0];
    const delta = orientation === 'horizontal' 
      ? touch.clientX - startPos.x 
      : touch.clientY - startPos.y;
    
    dispatch('drag', { 
      delta,
      x: touch.clientX, 
      y: touch.clientY 
    });
  }
  
  function handleTouchEnd(e: TouchEvent) {
    if (!isDragging) return;
    
    isDragging = false;
    const touch = e.changedTouches[0];
    
    dispatch('dragend', { x: touch.clientX, y: touch.clientY });
  }
</script>

<div
  bind:this={handleElement}
  class="drag-handle {orientation}"
  class:dragging={isDragging}
  class:disabled
  on:mousedown={handleMouseDown}
  on:touchstart={handleTouchStart}
  on:touchmove={handleTouchMove}
  on:touchend={handleTouchEnd}
  role="separator"
  aria-orientation={orientation}
  aria-disabled={disabled}
  tabindex={disabled ? -1 : 0}
>
  <div class="handle-grip"></div>
</div>

<style>
  .drag-handle {
    position: relative;
    background: var(--drag-handle-bg, #e0e0e0);
    transition: background-color 0.2s ease;
    z-index: 10;
    user-select: none;
    touch-action: none;
  }
  
  .drag-handle.horizontal {
    width: var(--drag-handle-size, 4px);
    height: 100%;
    cursor: col-resize;
  }
  
  .drag-handle.vertical {
    width: 100%;
    height: var(--drag-handle-size, 4px);
    cursor: row-resize;
  }
  
  .drag-handle:hover:not(.disabled) {
    background: var(--drag-handle-hover-bg, #bdbdbd);
  }
  
  .drag-handle.dragging {
    background: var(--drag-handle-active-bg, #9e9e9e);
  }
  
  .drag-handle.disabled {
    cursor: default;
    opacity: 0.5;
  }
  
  .handle-grip {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
  }
  
  .horizontal .handle-grip {
    width: 2px;
    height: 30px;
    background: repeating-linear-gradient(
      to bottom,
      transparent,
      transparent 2px,
      var(--drag-handle-grip-color, #999) 2px,
      var(--drag-handle-grip-color, #999) 4px
    );
  }
  
  .vertical .handle-grip {
    width: 30px;
    height: 2px;
    background: repeating-linear-gradient(
      to right,
      transparent,
      transparent 2px,
      var(--drag-handle-grip-color, #999) 2px,
      var(--drag-handle-grip-color, #999) 4px
    );
  }
  
  /* Increase hit area for easier grabbing */
  .drag-handle::before {
    content: '';
    position: absolute;
    inset: 0;
  }
  
  .horizontal::before {
    left: -4px;
    right: -4px;
  }
  
  .vertical::before {
    top: -4px;
    bottom: -4px;
  }
  
  /* Global styles when dragging */
  :global(body.dragging) {
    cursor: col-resize !important;
    user-select: none !important;
  }
  
  :global(body.dragging.vertical) {
    cursor: row-resize !important;
  }
</style>