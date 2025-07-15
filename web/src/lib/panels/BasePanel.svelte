<script lang="ts">
  import type { PanelProps } from './types';
  import { createEventDispatcher, onMount } from 'svelte';
  
  export let config: PanelProps['config'];
  export let state: PanelProps['state'];
  export let onClose: PanelProps['onClose'] = undefined;
  export let onMinimize: PanelProps['onMinimize'] = undefined;
  export let onMaximize: PanelProps['onMaximize'] = undefined;
  export let onRestore: PanelProps['onRestore'] = undefined;
  export let onFocus: PanelProps['onFocus'] = undefined;
  export let onResize: PanelProps['onResize'] = undefined;
  export let onMove: PanelProps['onMove'] = undefined;
  
  const dispatch = createEventDispatcher();
  
  let panelElement: HTMLDivElement;
  let isDragging = false;
  let isResizing = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let resizeStartWidth = 0;
  let resizeStartHeight = 0;
  let resizeStartX = 0;
  let resizeStartY = 0;
  
  $: panelStyle = `
    left: ${state.x}px;
    top: ${state.y}px;
    width: ${state.width}px;
    height: ${state.height}px;
    z-index: ${state.zIndex};
    display: ${state.isMinimized ? 'none' : 'block'};
  `;
  
  function handleMouseDown(e: MouseEvent) {
    if (e.button !== 0) return;
    
    const target = e.target as HTMLElement;
    if (target.closest('.panel-header') && !target.closest('.panel-controls')) {
      startDragging(e);
    }
    
    handleFocus();
  }
  
  function startDragging(e: MouseEvent) {
    if (!config.movable) return;
    
    isDragging = true;
    dragStartX = e.clientX - state.x;
    dragStartY = e.clientY - state.y;
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    e.preventDefault();
  }
  
  function handleMouseMove(e: MouseEvent) {
    if (isDragging) {
      const newX = e.clientX - dragStartX;
      const newY = e.clientY - dragStartY;
      
      onMove?.(newX, newY);
      dispatch('move', { x: newX, y: newY });
    } else if (isResizing) {
      const deltaX = e.clientX - resizeStartX;
      const deltaY = e.clientY - resizeStartY;
      
      const newWidth = Math.max(config.minWidth || 200, Math.min(config.maxWidth || Infinity, resizeStartWidth + deltaX));
      const newHeight = Math.max(config.minHeight || 150, Math.min(config.maxHeight || Infinity, resizeStartHeight + deltaY));
      
      onResize?.(newWidth, newHeight);
      dispatch('resize', { width: newWidth, height: newHeight });
    }
  }
  
  function handleMouseUp() {
    isDragging = false;
    isResizing = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  }
  
  function startResizing(e: MouseEvent) {
    if (!config.resizable) return;
    
    isResizing = true;
    resizeStartX = e.clientX;
    resizeStartY = e.clientY;
    resizeStartWidth = state.width;
    resizeStartHeight = state.height;
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    e.preventDefault();
  }
  
  function handleFocus() {
    onFocus?.();
    dispatch('focus');
  }
  
  function handleClose() {
    onClose?.();
    dispatch('close');
  }
  
  function handleMinimize() {
    onMinimize?.();
    dispatch('minimize');
  }
  
  function handleMaximize() {
    if (state.isMaximized) {
      onRestore?.();
      dispatch('restore');
    } else {
      onMaximize?.();
      dispatch('maximize');
    }
  }
  
  onMount(() => {
    console.log('BasePanel mounted:', config.title);
    console.log('Panel dimensions:', state.width, 'x', state.height);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  });
</script>

<div
  bind:this={panelElement}
  class="panel {state.isMaximized ? 'panel-maximized' : ''}"
  style={panelStyle}
  on:mousedown={handleMouseDown}
  role="dialog"
  aria-label={config.title}
>
  <div class="panel-header">
    {#if config.icon}
      <span class="panel-icon">{config.icon}</span>
    {/if}
    <h3 class="panel-title">{config.title}</h3>
    <div class="panel-controls">
      {#if config.minimizable}
        <button
          class="panel-control-btn minimize-btn"
          on:click={handleMinimize}
          aria-label="Minimize panel"
        >
          <svg width="12" height="12" viewBox="0 0 12 12">
            <line x1="2" y1="6" x2="10" y2="6" stroke="currentColor" stroke-width="2"/>
          </svg>
        </button>
      {/if}
      {#if config.maximizable}
        <button
          class="panel-control-btn maximize-btn"
          on:click={handleMaximize}
          aria-label={state.isMaximized ? "Restore panel" : "Maximize panel"}
        >
          <svg width="12" height="12" viewBox="0 0 12 12">
            {#if state.isMaximized}
              <rect x="3" y="3" width="6" height="6" stroke="currentColor" stroke-width="1.5" fill="none"/>
            {:else}
              <rect x="2" y="2" width="8" height="8" stroke="currentColor" stroke-width="1.5" fill="none"/>
            {/if}
          </svg>
        </button>
      {/if}
      {#if config.closable}
        <button
          class="panel-control-btn close-btn"
          on:click={handleClose}
          aria-label="Close panel"
        >
          <svg width="12" height="12" viewBox="0 0 12 12">
            <line x1="3" y1="3" x2="9" y2="9" stroke="currentColor" stroke-width="2"/>
            <line x1="9" y1="3" x2="3" y2="9" stroke="currentColor" stroke-width="2"/>
          </svg>
        </button>
      {/if}
    </div>
  </div>
  
  <div class="panel-content">
    <slot />
  </div>
  
  {#if config.resizable && !state.isMaximized}
    <div
      class="panel-resize-handle"
      on:mousedown={startResizing}
      on:keydown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          // Keyboard resize not implemented yet
        }
      }}
      role="separator"
      aria-label="Resize panel"
      tabindex="0"
    />
  {/if}
</div>

<style>
  .panel {
    position: absolute;
    background: var(--panel-bg, #ffffff);
    border: 1px solid var(--panel-border, #e0e0e0);
    border-radius: var(--panel-radius, 8px);
    box-shadow: var(--panel-shadow, 0 4px 12px rgba(0, 0, 0, 0.1));
    display: flex;
    flex-direction: column;
    overflow: hidden;
    transition: box-shadow 0.2s ease;
  }
  
  .panel:hover {
    box-shadow: var(--panel-shadow-hover, 0 6px 16px rgba(0, 0, 0, 0.15));
  }
  
  .panel-maximized {
    position: fixed !important;
    left: 0 !important;
    top: 0 !important;
    width: 100vw !important;
    height: 100vh !important;
    border-radius: 0 !important;
  }
  
  .panel-header {
    display: flex;
    align-items: center;
    padding: 12px 16px;
    background: var(--panel-header-bg, #f5f5f5);
    border-bottom: 1px solid var(--panel-border, #e0e0e0);
    user-select: none;
    cursor: move;
  }
  
  .panel-icon {
    margin-right: 8px;
    font-size: 18px;
  }
  
  .panel-title {
    flex: 1;
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    color: var(--panel-title-color, #333333);
  }
  
  .panel-controls {
    display: flex;
    gap: 4px;
    margin-left: auto;
  }
  
  .panel-control-btn {
    width: 28px;
    height: 28px;
    padding: 0;
    border: none;
    background: transparent;
    border-radius: 4px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--panel-control-color, #666666);
    transition: background-color 0.2s ease, color 0.2s ease;
  }
  
  .panel-control-btn:hover {
    background: var(--panel-control-hover-bg, rgba(0, 0, 0, 0.05));
  }
  
  .panel-control-btn:active {
    background: var(--panel-control-active-bg, rgba(0, 0, 0, 0.1));
  }
  
  .close-btn:hover {
    background: var(--panel-close-hover-bg, #ff4444);
    color: white;
  }
  
  .panel-content {
    flex: 1;
    overflow: auto;
    padding: var(--panel-content-padding, 16px);
    min-height: 0; /* Fix flexbox height issues */
  }
  
  .panel-resize-handle {
    position: absolute;
    bottom: 0;
    right: 0;
    width: 16px;
    height: 16px;
    cursor: nwse-resize;
    background: linear-gradient(135deg, transparent 50%, var(--panel-resize-color, #cccccc) 50%);
  }
  
  .panel-resize-handle::before {
    content: '';
    position: absolute;
    bottom: 3px;
    right: 3px;
    width: 6px;
    height: 6px;
    border-right: 2px solid var(--panel-resize-grip-color, #999999);
    border-bottom: 2px solid var(--panel-resize-grip-color, #999999);
  }
</style>