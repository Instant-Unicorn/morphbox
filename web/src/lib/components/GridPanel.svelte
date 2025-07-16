<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { Panel } from '$lib/stores/panels';
  import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight, X } from 'lucide-svelte';
  
  export let panel: Panel;
  export let component: any;
  export let websocketUrl: string = '';
  
  const dispatch = createEventDispatcher();
  
  function handleMove(direction: string) {
    dispatch('move', { panelId: panel.id, direction });
  }
  
  function handleClose() {
    dispatch('close');
  }
</script>

<div class="grid-panel">
  <div class="panel-header">
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
      <button 
        class="control-btn"
        on:click={() => handleMove('left')}
        title="Split left"
      >
        <ChevronLeft size={16} />
      </button>
      <button 
        class="control-btn"
        on:click={() => handleMove('right')}
        title="Split right"
      >
        <ChevronRight size={16} />
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
      {#if panel.type === 'terminal'}
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
</div>

<style>
  .grid-panel {
    display: flex;
    flex-direction: column;
    height: 100%;
    background-color: var(--panel-bg, #2d2d30);
    border: 1px solid var(--panel-border, #3e3e42);
    overflow: hidden;
  }
  
  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    background-color: var(--panel-header-bg, #323233);
    border-bottom: 1px solid var(--panel-border, #3e3e42);
    flex-shrink: 0;
  }
  
  .panel-title {
    margin: 0;
    font-size: 14px;
    font-weight: 500;
    color: var(--panel-title-color, #cccccc);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  
  .panel-controls {
    display: flex;
    gap: 4px;
    align-items: center;
  }
  
  .control-btn {
    background: none;
    border: none;
    color: var(--panel-control-color, #858585);
    cursor: pointer;
    padding: 4px;
    border-radius: 3px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
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
      padding: 6px 8px;
    }
    
    .control-btn {
      padding: 6px;
      min-width: 32px;
      min-height: 32px;
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