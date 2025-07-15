<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte';
  import FileTreeItem from './FileTreeItem.svelte';
  import ContextMenu from './ContextMenu.svelte';
  import type { FileItem, ContextMenuAction } from './types';
  import { fetchDirectory, createFile, createDirectory, deleteItem, renameItem } from './fileOperations';
  
  const dispatch = createEventDispatcher();
  
  export let rootPath = '/workspace';
  export let selectedFile: string | null = null;
  
  let rootItems: FileItem[] = [];
  let loading = true;
  let error: string | null = null;
  let contextMenu: { x: number; y: number; item: FileItem | null } | null = null;
  let renamingItem: string | null = null;
  
  onMount(async () => {
    await loadDirectory(rootPath);
  });
  
  async function loadDirectory(path: string) {
    loading = true;
    error = null;
    
    try {
      const items = await fetchDirectory(path);
      rootItems = items;
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load directory';
      console.error('Error loading directory:', err);
    } finally {
      loading = false;
    }
  }
  
  function handleSelect(event: CustomEvent<{ path: string }>) {
    selectedFile = event.detail.path;
    dispatch('select', { path: event.detail.path });
  }
  
  function handleOpen(event: CustomEvent<{ path: string; isDirectory: boolean }>) {
    if (!event.detail.isDirectory) {
      dispatch('open', { path: event.detail.path });
    }
  }
  
  function handleContextMenu(event: CustomEvent<{ x: number; y: number; item: FileItem | null }>) {
    contextMenu = event.detail;
  }
  
  function handleContextMenuAction(action: ContextMenuAction) {
    if (!contextMenu) return;
    
    switch (action) {
      case 'create-file':
        handleCreateFile();
        break;
      case 'create-folder':
        handleCreateFolder();
        break;
      case 'rename':
        if (contextMenu.item) {
          renamingItem = contextMenu.item.path;
        }
        break;
      case 'delete':
        if (contextMenu.item) {
          handleDelete(contextMenu.item);
        }
        break;
    }
    
    contextMenu = null;
  }
  
  async function handleCreateFile() {
    const basePath = contextMenu?.item?.isDirectory ? contextMenu.item.path : rootPath;
    const name = prompt('Enter file name:');
    
    if (name) {
      try {
        await createFile(basePath, name);
        await refreshDirectory(basePath);
      } catch (err) {
        console.error('Error creating file:', err);
        alert('Failed to create file');
      }
    }
  }
  
  async function handleCreateFolder() {
    const basePath = contextMenu?.item?.isDirectory ? contextMenu.item.path : rootPath;
    const name = prompt('Enter folder name:');
    
    if (name) {
      try {
        await createDirectory(basePath, name);
        await refreshDirectory(basePath);
      } catch (err) {
        console.error('Error creating folder:', err);
        alert('Failed to create folder');
      }
    }
  }
  
  async function handleDelete(item: FileItem) {
    const confirmed = confirm(`Are you sure you want to delete "${item.name}"?`);
    
    if (confirmed) {
      try {
        await deleteItem(item.path);
        await refreshDirectory(item.parent || rootPath);
      } catch (err) {
        console.error('Error deleting item:', err);
        alert('Failed to delete item');
      }
    }
  }
  
  async function handleRename(event: CustomEvent<{ oldPath: string; newName: string }>) {
    try {
      await renameItem(event.detail.oldPath, event.detail.newName);
      const parentPath = event.detail.oldPath.substring(0, event.detail.oldPath.lastIndexOf('/'));
      await refreshDirectory(parentPath || rootPath);
    } catch (err) {
      console.error('Error renaming item:', err);
      alert('Failed to rename item');
    }
    
    renamingItem = null;
  }
  
  async function refreshDirectory(path: string) {
    if (path === rootPath) {
      await loadDirectory(path);
    } else {
      // Find and reload the specific directory in the tree
      const updateItems = (items: FileItem[]): FileItem[] => {
        return items.map(item => {
          if (item.path === path && item.isDirectory) {
            return { ...item, children: undefined, expanded: true };
          } else if (item.children) {
            return { ...item, children: updateItems(item.children) };
          }
          return item;
        });
      };
      
      rootItems = updateItems(rootItems);
    }
  }
  
  function handleGlobalClick() {
    if (contextMenu) {
      contextMenu = null;
    }
  }
  
  function handleGlobalKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' && contextMenu) {
      contextMenu = null;
    }
  }
</script>

<div class="file-explorer" role="region" aria-label="File Explorer" on:click={handleGlobalClick} on:keydown={handleGlobalKeydown}>
  <div class="file-explorer-header">
    <h3>Explorer</h3>
    <button 
      class="refresh-btn" 
      on:click={() => loadDirectory(rootPath)}
      title="Refresh"
    >
      ↻
    </button>
  </div>
  
  <div class="file-explorer-content">
    {#if loading}
      <div class="loading">Loading...</div>
    {:else if error}
      <div class="error">{error}</div>
    {:else}
      <div class="file-tree">
        {#each rootItems as item (item.path)}
          <FileTreeItem 
            {item} 
            {selectedFile}
            {renamingItem}
            on:select={handleSelect}
            on:open={handleOpen}
            on:contextmenu={handleContextMenu}
            on:rename={handleRename}
          />
        {/each}
      </div>
    {/if}
  </div>
  
  {#if contextMenu}
    <ContextMenu 
      x={contextMenu.x} 
      y={contextMenu.y}
      item={contextMenu.item}
      on:action={(e) => handleContextMenuAction(e.detail)}
      on:close={() => contextMenu = null}
    />
  {/if}
</div>

<style>
  .file-explorer {
    height: 100%;
    width: 100%;
    display: flex;
    flex-direction: column;
    background-color: #252526;
    color: #cccccc;
    user-select: none;
    position: relative;
    min-height: 0; /* Fix flexbox height issues */
  }
  
  .file-explorer-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 16px;
    border-bottom: 1px solid #3e3e42;
    background-color: #2d2d30;
  }
  
  .file-explorer-header h3 {
    margin: 0;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: #cccccc;
  }
  
  .refresh-btn {
    background: none;
    border: none;
    color: #cccccc;
    cursor: pointer;
    font-size: 14px;
    padding: 4px;
    border-radius: 3px;
    transition: background-color 0.2s;
  }
  
  .refresh-btn:hover {
    background-color: #3e3e42;
  }
  
  .file-explorer-content {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    min-height: 0; /* Fix flexbox height issues */
  }
  
  .file-tree {
    padding: 4px 0;
  }
  
  .loading, .error {
    padding: 16px;
    text-align: center;
    font-size: 13px;
  }
  
  .error {
    color: #f48771;
  }
  
  /* Custom scrollbar */
  .file-explorer-content::-webkit-scrollbar {
    width: 10px;
  }
  
  .file-explorer-content::-webkit-scrollbar-track {
    background: transparent;
  }
  
  .file-explorer-content::-webkit-scrollbar-thumb {
    background: #424242;
    border-radius: 5px;
  }
  
  .file-explorer-content::-webkit-scrollbar-thumb:hover {
    background: #4e4e4e;
  }
</style>