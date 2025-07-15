<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte';
  import DragHandle from './DragHandle.svelte';
  
  export let orientation: 'horizontal' | 'vertical' = 'horizontal';
  export let split: number = 50; // Percentage for first pane
  export let minSize: number = 100; // Minimum size in pixels
  export let maxSize: number | null = null; // Maximum size in pixels
  export let disabled: boolean = false;
  export let className: string = '';
  export let pane1Class: string = '';
  export let pane2Class: string = '';
  
  const dispatch = createEventDispatcher();
  
  let container: HTMLDivElement;
  let pane1: HTMLDivElement;
  let pane2: HTMLDivElement;
  let isDragging = false;
  let containerSize = 0;
  let currentSplit = split;
  
  // Convert percentage to pixels
  $: splitPixels = (containerSize * currentSplit) / 100;
  
  // Calculate actual sizes respecting constraints
  $: pane1Size = Math.max(
    minSize,
    Math.min(
      splitPixels,
      maxSize !== null ? Math.min(maxSize, containerSize - minSize) : containerSize - minSize
    )
  );
  
  $: pane2Size = containerSize - pane1Size;
  
  // Update styles
  $: if (pane1 && pane2) {
    if (orientation === 'horizontal') {
      pane1.style.width = `${pane1Size}px`;
      pane2.style.width = `${pane2Size}px`;
    } else {
      pane1.style.height = `${pane1Size}px`;
      pane2.style.height = `${pane2Size}px`;
    }
  }
  
  function updateContainerSize() {
    if (!container) return;
    
    const rect = container.getBoundingClientRect();
    containerSize = orientation === 'horizontal' ? rect.width : rect.height;
  }
  
  function handleDragStart() {
    isDragging = true;
    document.body.classList.add('dragging', orientation);
    dispatch('splitstart');
  }
  
  function handleDrag(event: CustomEvent) {
    if (!isDragging || disabled) return;
    
    const { delta } = event.detail;
    const newSize = pane1Size + delta;
    
    // Apply constraints
    const constrainedSize = Math.max(
      minSize,
      Math.min(
        newSize,
        maxSize !== null ? Math.min(maxSize, containerSize - minSize) : containerSize - minSize
      )
    );
    
    // Update split percentage
    currentSplit = (constrainedSize / containerSize) * 100;
    
    // Dispatch resize event
    dispatch('splitchange', { 
      split: currentSplit,
      pane1Size: constrainedSize,
      pane2Size: containerSize - constrainedSize
    });
  }
  
  function handleDragEnd() {
    isDragging = false;
    document.body.classList.remove('dragging', orientation);
    dispatch('splitend', { split: currentSplit });
  }
  
  function handleKeyDown(event: KeyboardEvent) {
    if (disabled) return;
    
    const step = event.shiftKey ? 10 : 1;
    let newSplit = currentSplit;
    
    switch (event.key) {
      case 'ArrowLeft':
      case 'ArrowUp':
        event.preventDefault();
        newSplit = Math.max(
          (minSize / containerSize) * 100,
          currentSplit - step
        );
        break;
      case 'ArrowRight':
      case 'ArrowDown':
        event.preventDefault();
        newSplit = Math.min(
          ((containerSize - minSize) / containerSize) * 100,
          currentSplit + step
        );
        break;
      case 'Home':
        event.preventDefault();
        newSplit = (minSize / containerSize) * 100;
        break;
      case 'End':
        event.preventDefault();
        newSplit = ((containerSize - minSize) / containerSize) * 100;
        break;
      default:
        return;
    }
    
    currentSplit = newSplit;
    dispatch('splitchange', { split: currentSplit });
  }
  
  onMount(() => {
    updateContainerSize();
    
    // Watch for container resize
    const resizeObserver = new ResizeObserver(() => {
      updateContainerSize();
    });
    
    resizeObserver.observe(container);
    
    return () => {
      resizeObserver.disconnect();
    };
  });
  
  // Update current split when prop changes
  $: currentSplit = split;
</script>

<div
  bind:this={container}
  class="split-pane {orientation} {className}"
  class:disabled
  role="application"
  aria-label="Split pane container"
  tabindex="0"
  on:keydown={handleKeyDown}
>
  <div
    bind:this={pane1}
    class="split-pane-pane pane1 {pane1Class}"
  >
    <slot name="pane1" />
  </div>
  
  <DragHandle
    {orientation}
    {disabled}
    on:dragstart={handleDragStart}
    on:drag={handleDrag}
    on:dragend={handleDragEnd}
  />
  
  <div
    bind:this={pane2}
    class="split-pane-pane pane2 {pane2Class}"
  >
    <slot name="pane2" />
  </div>
</div>

<style>
  .split-pane {
    display: flex;
    width: 100%;
    height: 100%;
    position: relative;
    overflow: hidden;
    outline: none;
  }
  
  .split-pane:focus {
    box-shadow: inset 0 0 0 2px var(--focus-ring-color, #0066cc);
  }
  
  .split-pane.horizontal {
    flex-direction: row;
  }
  
  .split-pane.vertical {
    flex-direction: column;
  }
  
  .split-pane.disabled {
    opacity: 0.8;
  }
  
  .split-pane-pane {
    position: relative;
    overflow: auto;
    flex-shrink: 0;
  }
  
  .horizontal .split-pane-pane {
    height: 100%;
  }
  
  .vertical .split-pane-pane {
    width: 100%;
  }
  
  /* Smooth transitions when not dragging */
  .split-pane:not(.dragging) .split-pane-pane {
    transition: width 0.2s ease, height 0.2s ease;
  }
  
  /* Remove transitions during drag for performance */
  :global(body.dragging) .split-pane-pane {
    transition: none !important;
  }
  
  /* Optional: Custom styling for panes */
  .pane1 {
    background: var(--pane1-bg, transparent);
  }
  
  .pane2 {
    background: var(--pane2-bg, transparent);
  }
</style>