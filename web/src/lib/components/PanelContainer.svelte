<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  
  export let title: string = '';
  export let showHeader: boolean = true;
  export let closable: boolean = false;
  export let collapsible: boolean = false;
  export let collapsed: boolean = false;
  export let className: string = '';
  export let headerActions: boolean = true;
  
  const dispatch = createEventDispatcher();
  
  function handleClose() {
    dispatch('close');
  }
  
  function toggleCollapse() {
    collapsed = !collapsed;
    dispatch('collapse', { collapsed });
  }
  
  function handleHeaderClick(e: MouseEvent) {
    if (collapsible && e.target === e.currentTarget) {
      toggleCollapse();
    }
  }
</script>

<div class="panel-container {className}" class:collapsed>
  {#if showHeader}
    <header 
      class="panel-header" 
      class:collapsible
      on:click={handleHeaderClick}
    >
      <div class="panel-title">
        {#if collapsible}
          <button
            class="collapse-button"
            on:click|stopPropagation={toggleCollapse}
            aria-label={collapsed ? 'Expand panel' : 'Collapse panel'}
          >
            <svg 
              class="collapse-icon" 
              width="12" 
              height="12" 
              viewBox="0 0 12 12"
              aria-hidden="true"
            >
              <path 
                d="M3 5 L6 8 L9 5" 
                stroke="currentColor" 
                stroke-width="2" 
                fill="none"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </button>
        {/if}
        <span class="title-text">{title}</span>
      </div>
      
      <div class="panel-actions">
        {#if headerActions}
          <slot name="header-actions" />
        {/if}
        
        {#if closable}
          <button
            class="close-button"
            on:click={handleClose}
            aria-label="Close panel"
          >
            <svg 
              width="16" 
              height="16" 
              viewBox="0 0 16 16"
              aria-hidden="true"
            >
              <path 
                d="M4 4 L12 12 M12 4 L4 12" 
                stroke="currentColor" 
                stroke-width="2" 
                stroke-linecap="round"
              />
            </svg>
          </button>
        {/if}
      </div>
    </header>
  {/if}
  
  <div class="panel-content" class:no-header={!showHeader}>
    {#if !collapsed}
      <slot />
    {/if}
  </div>
</div>

<style>
  .panel-container {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: var(--panel-bg, #ffffff);
    border: 1px solid var(--panel-border, #e0e0e0);
    border-radius: var(--panel-radius, 4px);
    overflow: hidden;
  }
  
  .panel-container.collapsed {
    min-height: auto;
  }
  
  .panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--panel-header-padding, 12px 16px);
    background: var(--panel-header-bg, #f5f5f5);
    border-bottom: 1px solid var(--panel-border, #e0e0e0);
    min-height: var(--panel-header-height, 48px);
    user-select: none;
  }
  
  .panel-header.collapsible {
    cursor: pointer;
  }
  
  .panel-title {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1;
    min-width: 0;
  }
  
  .title-text {
    font-weight: 500;
    font-size: var(--panel-title-size, 14px);
    color: var(--panel-title-color, #333);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  
  .panel-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-left: 16px;
  }
  
  .panel-content {
    flex: 1;
    overflow: auto;
    padding: var(--panel-content-padding, 16px);
  }
  
  .panel-content.no-header {
    padding: var(--panel-content-padding-no-header, 0);
  }
  
  .collapsed .panel-content {
    display: none;
  }
  
  .collapse-button,
  .close-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    padding: 0;
    background: transparent;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    color: var(--panel-action-color, #666);
    transition: all 0.2s ease;
  }
  
  .collapse-button:hover,
  .close-button:hover {
    background: var(--panel-action-hover-bg, rgba(0, 0, 0, 0.05));
    color: var(--panel-action-hover-color, #333);
  }
  
  .collapse-button:active,
  .close-button:active {
    background: var(--panel-action-active-bg, rgba(0, 0, 0, 0.1));
  }
  
  .collapse-icon {
    transition: transform 0.2s ease;
  }
  
  .collapsed .collapse-icon {
    transform: rotate(-90deg);
  }
  
  /* Custom scrollbar for panel content */
  .panel-content::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }
  
  .panel-content::-webkit-scrollbar-track {
    background: var(--scrollbar-track, #f1f1f1);
  }
  
  .panel-content::-webkit-scrollbar-thumb {
    background: var(--scrollbar-thumb, #c1c1c1);
    border-radius: 4px;
  }
  
  .panel-content::-webkit-scrollbar-thumb:hover {
    background: var(--scrollbar-thumb-hover, #a8a8a8);
  }
  
  /* Slot styles for header actions */
  :global(.panel-actions > *) {
    flex-shrink: 0;
  }
</style>