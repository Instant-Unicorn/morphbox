<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  
  export let direction: 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';
  export let panelId: string;
  
  const dispatch = createEventDispatcher();
  
  let isResizing = false;
  let startX = 0;
  let startY = 0;
  
  function getCursor() {
    const cursors = {
      n: 'ns-resize',
      s: 'ns-resize',
      e: 'ew-resize',
      w: 'ew-resize',
      ne: 'nesw-resize',
      nw: 'nwse-resize',
      se: 'nwse-resize',
      sw: 'nesw-resize'
    };
    return cursors[direction];
  }
  
  function handleMouseDown(e: MouseEvent) {
    isResizing = true;
    startX = e.clientX;
    startY = e.clientY;
    
    // Add global listeners
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    
    // Prevent text selection
    e.preventDefault();
    
    dispatch('resizestart', { panelId, direction });
  }
  
  function handleTouchStart(e: TouchEvent) {
    if (e.touches.length !== 1) return;
    
    isResizing = true;
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    
    // Add global listeners
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);
    
    e.preventDefault();
    
    dispatch('resizestart', { panelId, direction });
  }
  
  function handleMouseMove(e: MouseEvent) {
    if (!isResizing) return;
    
    const deltaX = e.clientX - startX;
    const deltaY = e.clientY - startY;
    
    // Only dispatch if there's meaningful movement
    if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
      dispatch('resize', { 
        panelId, 
        direction,
        deltaX,
        deltaY
      });
    }
  }
  
  function handleMouseUp() {
    if (!isResizing) return;
    
    isResizing = false;
    
    // Remove global listeners
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
    
    dispatch('resizeend', { panelId });
  }
  
  function handleTouchMove(e: TouchEvent) {
    if (!isResizing || e.touches.length !== 1) return;
    
    e.preventDefault();
    
    const deltaX = e.touches[0].clientX - startX;
    const deltaY = e.touches[0].clientY - startY;
    
    dispatch('resize', { 
      panelId, 
      direction,
      deltaX,
      deltaY
    });
  }
  
  function handleTouchEnd() {
    if (!isResizing) return;
    
    isResizing = false;
    
    // Remove global listeners
    window.removeEventListener('touchmove', handleTouchMove);
    window.removeEventListener('touchend', handleTouchEnd);
    
    dispatch('resizeend', { panelId });
  }
  
  // Clean up on unmount
  onMount(() => {
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  });
</script>

<div 
  class="resize-handle resize-{direction}"
  style="cursor: {getCursor()}"
  on:mousedown={handleMouseDown}
  on:touchstart={handleTouchStart}
  role="separator"
  aria-label="Resize handle"
  tabindex="-1"
/>

<style>
  .resize-handle {
    position: absolute;
    background: transparent;
    z-index: 10;
    transition: background-color 0.2s;
  }
  
  .resize-handle:hover {
    background-color: var(--accent-color, #0e639c);
  }
  
  /* Edge handles */
  .resize-n {
    top: -4px;
    left: 0;
    right: 0;
    height: 8px;
  }
  
  .resize-s {
    bottom: -4px;
    left: 0;
    right: 0;
    height: 8px;
  }
  
  .resize-e {
    top: 0;
    bottom: 0;
    right: -4px;
    width: 8px;
  }
  
  .resize-w {
    top: 0;
    bottom: 0;
    left: -4px;
    width: 8px;
  }
  
  /* Corner handles */
  .resize-ne {
    top: -3px;
    right: -3px;
    width: 12px;
    height: 12px;
  }
  
  .resize-nw {
    top: -3px;
    left: -3px;
    width: 12px;
    height: 12px;
  }
  
  .resize-se {
    bottom: -3px;
    right: -3px;
    width: 12px;
    height: 12px;
  }
  
  .resize-sw {
    bottom: -3px;
    left: -3px;
    width: 12px;
    height: 12px;
  }
  
  /* Mobile adjustments */
  @media (hover: none) {
    .resize-handle {
      /* Make handles bigger on touch devices */
      background-color: rgba(255, 255, 255, 0.1);
    }
    
    .resize-n, .resize-s {
      height: 12px;
    }
    
    .resize-e, .resize-w {
      width: 12px;
    }
    
    .resize-ne, .resize-nw, .resize-se, .resize-sw {
      width: 20px;
      height: 20px;
    }
  }
</style>