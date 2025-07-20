<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { FileItem } from './types';
  import { fetchDirectory } from './fileOperations';
  import { getFileIcon } from './fileIcons';
  
  const dispatch = createEventDispatcher();
  
  export let item: FileItem;
  export let selectedFile: string | null = null;
  export let renamingItem: string | null = null;
  export let level = 0;
  
  let expanded = false;
  let loading = false;
  let newName = item.name;
  
  $: isSelected = selectedFile === item.path;
  $: isRenaming = renamingItem === item.path;
  $: icon = getFileIcon(item.name, item.isDirectory);
  
  async function toggleExpand() {
    if (!item.isDirectory) return;
    
    if (!expanded && !item.children) {
      loading = true;
      try {
        const children = await fetchDirectory(item.path);
        item.children = children;
      } catch (err) {
        console.error('Error loading directory:', err);
      } finally {
        loading = false;
      }
    }
    
    expanded = !expanded;
  }
  
  function handleClick(event: MouseEvent) {
    event.stopPropagation();
    dispatch('select', { path: item.path });
    
    if (item.isDirectory) {
      toggleExpand();
    }
  }
  
  function handleDoubleClick(event: MouseEvent) {
    event.stopPropagation();
    dispatch('open', { path: item.path, isDirectory: item.isDirectory });
  }
  
  function handleContextMenu(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    
    dispatch('contextmenu', {
      x: event.clientX,
      y: event.clientY,
      item
    });
  }
  
  function handleKeyDown(event: KeyboardEvent) {
    if (isRenaming) {
      if (event.key === 'Enter') {
        event.preventDefault();
        confirmRename();
      } else if (event.key === 'Escape') {
        event.preventDefault();
        cancelRename();
      }
    } else {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleClick(new MouseEvent('click'));
      } else if (event.key === 'F2') {
        event.preventDefault();
        dispatch('rename', { item });
      }
    }
  }
  
  function confirmRename() {
    if (newName && newName !== item.name) {
      dispatch('rename', { oldPath: item.path, newName });
    }
    renamingItem = null;
  }
  
  function cancelRename() {
    newName = item.name;
    renamingItem = null;
  }
  
  $: if (isRenaming) {
    // Focus the input when entering rename mode
    setTimeout(() => {
      const input = document.querySelector('.rename-input') as HTMLInputElement;
      if (input) {
        input.focus();
        input.select();
      }
    }, 0);
  }
</script>

<div class="tree-item">
  <div 
    class="tree-item-content"
    class:selected={isSelected}
    style="padding-left: {level * 16 + 8}px"
    role="treeitem"
    tabindex={isSelected ? 0 : -1}
    aria-expanded={item.isDirectory ? expanded : undefined}
    aria-selected={isSelected}
    on:click={handleClick}
    on:dblclick={handleDoubleClick}
    on:contextmenu={handleContextMenu}
    on:keydown={handleKeyDown}
  >
    {#if item.isDirectory}
      <span class="tree-arrow" class:expanded>
        {#if loading}
          <span class="loading-spinner">⟳</span>
        {:else}
          ▶
        {/if}
      </span>
    {:else}
      <span class="tree-indent"></span>
    {/if}
    
    <span class="tree-icon">{icon}</span>
    
    {#if isRenaming}
      <input
        type="text"
        class="rename-input"
        bind:value={newName}
        on:keydown={handleKeyDown}
        on:blur={confirmRename}
        on:click|stopPropagation
      />
    {:else}
      <span class="tree-label">{item.name}</span>
    {/if}
  </div>
  
  {#if item.isDirectory && expanded && item.children}
    <div class="tree-children">
      {#each item.children as child (child.path)}
        <svelte:self 
          item={child} 
          {selectedFile}
          {renamingItem}
          level={level + 1}
          on:select
          on:open
          on:contextmenu
          on:rename
        />
      {/each}
    </div>
  {/if}
</div>

<style>
  .tree-item {
    font-size: 13px;
  }
  
  .tree-item-content {
    display: flex;
    align-items: center;
    height: 22px;
    cursor: pointer;
    white-space: nowrap;
    overflow: hidden;
  }
  
  .tree-item-content:hover {
    background-color: var(--hover-bg, #2a2d2e);
  }
  
  .tree-item-content.selected {
    background-color: var(--accent-color, #094771);
  }
  
  .tree-arrow {
    width: 16px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    transition: transform 0.1s;
  }
  
  .tree-arrow.expanded {
    transform: rotate(90deg);
  }
  
  .tree-indent {
    width: 16px;
    display: inline-block;
    flex-shrink: 0;
  }
  
  .loading-spinner {
    animation: spin 1s linear infinite;
    display: inline-block;
  }
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  
  .tree-icon {
    margin-right: 4px;
    flex-shrink: 0;
    font-size: 16px;
    line-height: 1;
  }
  
  .tree-label {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    padding-right: 8px;
  }
  
  .tree-children {
    position: relative;
  }
  
  .rename-input {
    flex: 1;
    background-color: var(--input-bg, #3c3c3c);
    border: 1px solid var(--accent-color, #007acc);
    color: var(--text-color, #cccccc);
    padding: 0 4px;
    margin-right: 8px;
    height: 18px;
    font-size: 13px;
    font-family: inherit;
    outline: none;
  }
</style>