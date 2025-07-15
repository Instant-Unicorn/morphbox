<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import type { FileItem, ContextMenuAction } from './types';
  
  const dispatch = createEventDispatcher();
  
  export let x: number;
  export let y: number;
  export let item: FileItem | null;
  
  let menuElement: HTMLDivElement;
  
  onMount(() => {
    // Adjust position if menu would go off screen
    const rect = menuElement.getBoundingClientRect();
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    
    if (x + rect.width > windowWidth) {
      x = windowWidth - rect.width - 5;
    }
    
    if (y + rect.height > windowHeight) {
      y = windowHeight - rect.height - 5;
    }
    
    // Close menu when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (!menuElement.contains(event.target as Node)) {
        dispatch('close');
      }
    };
    
    document.addEventListener('click', handleClickOutside);
    
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  });
  
  function handleAction(action: ContextMenuAction) {
    dispatch('action', action);
  }
</script>

<div 
  class="context-menu" 
  bind:this={menuElement}
  style="left: {x}px; top: {y}px"
  on:click|stopPropagation
>
  <div class="menu-item" on:click={() => handleAction('create-file')}>
    <span class="menu-icon">📄</span>
    New File
  </div>
  <div class="menu-item" on:click={() => handleAction('create-folder')}>
    <span class="menu-icon">📁</span>
    New Folder
  </div>
  
  {#if item}
    <div class="menu-separator"></div>
    <div class="menu-item" on:click={() => handleAction('rename')}>
      <span class="menu-icon">✏️</span>
      Rename
    </div>
    <div class="menu-item danger" on:click={() => handleAction('delete')}>
      <span class="menu-icon">🗑️</span>
      Delete
    </div>
  {/if}
</div>

<style>
  .context-menu {
    position: fixed;
    background-color: #2d2d30;
    border: 1px solid #454545;
    border-radius: 4px;
    padding: 4px 0;
    min-width: 150px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
    z-index: 1000;
  }
  
  .menu-item {
    display: flex;
    align-items: center;
    padding: 6px 16px;
    cursor: pointer;
    font-size: 13px;
    color: #cccccc;
    transition: background-color 0.1s;
  }
  
  .menu-item:hover {
    background-color: #094771;
  }
  
  .menu-item.danger {
    color: #f48771;
  }
  
  .menu-item.danger:hover {
    background-color: #5a1d1d;
  }
  
  .menu-icon {
    margin-right: 8px;
    font-size: 14px;
    width: 20px;
    text-align: center;
  }
  
  .menu-separator {
    height: 1px;
    background-color: #454545;
    margin: 4px 0;
  }
</style>