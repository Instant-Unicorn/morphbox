<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte';
  import FileTreeItem from './FileTreeItem.svelte';
  import ContextMenu from './ContextMenu.svelte';
  import type { FileItem, ContextMenuAction } from './types';
  import { fetchDirectory, createFile, createDirectory, deleteItem, renameItem } from './fileOperations';
  import { fileTargetStore, availableTargets, getDefaultTarget } from '$lib/stores/fileTarget';
  import type { Panel } from '$lib/stores/panels';
  import { settings as settingsStore } from '$lib/panels/Settings/settings-store';
  
  const dispatch = createEventDispatcher();
  
  export let rootPath = '';
  export let selectedFile: string | null = null;
  export let panelId: string = ''; // ID of this FileExplorer panel
  
  let rootItems: FileItem[] = [];
  let loading = true;
  let error: string | null = null;
  let contextMenu: { x: number; y: number; item: FileItem | null } | null = null;
  let renamingItem: string | null = null;
  let showTargetMenu = false;
  let targetPanelId: string | null = null;
  let targetPanels: Panel[] = [];
  
  // Subscribe to available target panels
  $: targetPanels = $availableTargets;
  
  // Initialize target panel
  onMount(() => {
    // Get saved target or default to null (which will create new panels)
    targetPanelId = fileTargetStore.getTarget(panelId);
    // Don't set a default target - let it remain null to create new panels
  });
  
  // Update target when selection changes
  function selectTarget(panel: Panel) {
    targetPanelId = panel.id;
    fileTargetStore.setTarget(panelId, panel.id);
    showTargetMenu = false;
  }
  
  // Get the current target panel
  $: currentTarget = targetPanels.find(p => p.id === targetPanelId);
  
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
    console.log('FileExplorer handleOpen:', event.detail);
    if (!event.detail.isDirectory) {
      console.log('Dispatching open event with targetPanelId:', targetPanelId);
      dispatch('open', { 
        path: event.detail.path,
        targetPanelId: targetPanelId 
      });
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
    if (e.key === 'Escape') {
      if (contextMenu) {
        contextMenu = null;
      }
      if (showTargetMenu) {
        showTargetMenu = false;
      }
    }
  }
  
  function handleTargetMenuKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      showTargetMenu = false;
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const buttons = e.currentTarget.querySelectorAll('.target-option');
      const currentIndex = Array.from(buttons).findIndex(btn => btn === document.activeElement);
      let newIndex = currentIndex;
      
      if (e.key === 'ArrowDown') {
        newIndex = currentIndex + 1 >= buttons.length ? 0 : currentIndex + 1;
      } else {
        newIndex = currentIndex - 1 < 0 ? buttons.length - 1 : currentIndex - 1;
      }
      
      (buttons[newIndex] as HTMLElement).focus();
    }
  }
</script>

<!-- svelte-ignore a11y-click-events-have-key-events a11y-no-noninteractive-element-interactions -->
<div class="file-explorer" role="region" aria-label="File Explorer" on:click={handleGlobalClick} on:keydown={handleGlobalKeydown}>
  <div class="file-explorer-header">
    <h3>Explorer</h3>
    <div class="header-actions">
      <div class="target-selector">
        <button 
          class="target-btn" 
          on:click|stopPropagation={() => showTargetMenu = !showTargetMenu}
          title="Select target panel for opening files"
          aria-expanded={showTargetMenu}
          aria-haspopup="menu"
        >
          <span class="target-icon">🎯</span>
          <span class="target-label">{currentTarget ? currentTarget.title : 'New Panel'}</span>
          <span class="dropdown-arrow">▼</span>
        </button>
        
        {#if showTargetMenu}
          <div class="target-menu" role="menu" tabindex="0" on:click|stopPropagation on:keydown={handleTargetMenuKeydown}>
            <div class="menu-header">Open files in:</div>
            <button 
              class="target-option" 
              class:selected={!targetPanelId}
              role="menuitem"
              aria-current={!targetPanelId ? "true" : undefined}
              on:click={() => {
                targetPanelId = null;
                fileTargetStore.clearTarget(panelId);
                showTargetMenu = false;
              }}
            >
              <span class="panel-type">new</span>
              <span class="panel-title">New Code Editor Panel</span>
            </button>
            {#if targetPanels.length > 0}
              <div class="menu-divider"></div>
            {/if}
            {#each targetPanels as panel}
              <button 
                class="target-option" 
                class:selected={panel.id === targetPanelId}
                role="menuitem"
                aria-current={panel.id === targetPanelId ? "true" : undefined}
                on:click={() => selectTarget(panel)}
              >
                <span class="panel-type">{panel.type}</span>
                <span class="panel-title">{panel.title}</span>
              </button>
            {/each}
          </div>
        {/if}
      </div>
      
      <button 
        class="refresh-btn" 
        on:click={() => loadDirectory(rootPath)}
        title="Refresh"
      >
        ↻
      </button>
    </div>
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
    background-color: var(--surface, #252526);
    color: var(--text-color, #cccccc);
    user-select: none;
    position: relative;
    min-height: 0; /* Fix flexbox height issues */
  }
  
  .file-explorer-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 16px;
    border-bottom: 1px solid var(--border-color, #3e3e42);
    background-color: var(--bg-color, #2d2d30);
  }
  
  .file-explorer-header h3 {
    margin: 0;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--text-color, #cccccc);
  }
  
  .header-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  
  .target-selector {
    position: relative;
  }
  
  .target-btn {
    display: flex;
    align-items: center;
    gap: 4px;
    background: var(--input-bg, #3e3e42);
    border: 1px solid var(--border-color, #464647);
    color: var(--text-color, #cccccc);
    cursor: pointer;
    font-size: 11px;
    padding: 4px 8px;
    border-radius: 4px;
    transition: all 0.2s;
    max-width: 150px;
  }
  
  .target-btn:hover {
    background-color: var(--hover-bg, #464647);
    border-color: var(--hover-border, #5a5a5c);
  }
  
  .target-icon {
    font-size: 12px;
  }
  
  .target-label {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  
  .dropdown-arrow {
    font-size: 8px;
    margin-left: 4px;
  }
  
  .target-menu {
    position: absolute;
    top: 100%;
    right: 0;
    margin-top: 4px;
    background: var(--bg-color, #2d2d30);
    border: 1px solid var(--border-color, #464647);
    border-radius: 4px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    min-width: 200px;
    max-width: 300px;
    z-index: 1000;
  }
  
  .menu-header {
    padding: 8px 12px;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--text-secondary, #969696);
    border-bottom: 1px solid var(--border-color, #464647);
  }
  
  .target-option {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: 8px 12px;
    background: none;
    border: none;
    color: var(--text-color, #cccccc);
    cursor: pointer;
    font-size: 12px;
    text-align: left;
    transition: background-color 0.2s;
  }
  
  .target-option:hover {
    background-color: var(--hover-bg, #3e3e42);
  }
  
  .target-option.selected {
    background-color: var(--accent-color, #094771);
  }
  
  .panel-type {
    font-size: 10px;
    text-transform: uppercase;
    color: var(--text-secondary, #969696);
    margin-right: 8px;
  }
  
  .panel-title {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  
  .refresh-btn {
    background: none;
    border: none;
    color: var(--text-color, #cccccc);
    cursor: pointer;
    font-size: 14px;
    padding: 4px;
    border-radius: 3px;
    transition: background-color 0.2s;
  }
  
  .refresh-btn:hover {
    background-color: var(--hover-bg, #3e3e42);
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
    color: var(--error-color, #f48771);
  }
  
  /* Custom scrollbar */
  .file-explorer-content::-webkit-scrollbar {
    width: 10px;
  }
  
  .file-explorer-content::-webkit-scrollbar-track {
    background: transparent;
  }
  
  .file-explorer-content::-webkit-scrollbar-thumb {
    background: var(--scrollbar-thumb, #424242);
    border-radius: 5px;
  }
  
  .file-explorer-content::-webkit-scrollbar-thumb:hover {
    background: var(--scrollbar-thumb-hover, #4e4e4e);
  }
  
  .menu-divider {
    height: 1px;
    background-color: var(--border-color, #3e3e42);
    margin: 4px 8px;
  }
</style>