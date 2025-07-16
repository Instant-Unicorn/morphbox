<script lang="ts">
  import { workspaces, activeWorkspaceId, panelStore } from '$lib/stores/panels';
  import { createEventDispatcher } from 'svelte';
  
  const dispatch = createEventDispatcher();
  
  let showDeleteConfirm: string | null = null;
  
  function addWorkspace() {
    panelStore.addWorkspace();
  }
  
  function switchWorkspace(workspaceId: string) {
    panelStore.switchWorkspace(workspaceId);
  }
  
  function confirmDeleteWorkspace(workspaceId: string) {
    // Don't allow deleting if it's the last workspace
    if ($workspaces.length <= 1) return;
    showDeleteConfirm = workspaceId;
  }
  
  function deleteWorkspace(workspaceId: string) {
    panelStore.removeWorkspace(workspaceId);
    showDeleteConfirm = null;
  }
  
  function cancelDelete() {
    showDeleteConfirm = null;
  }
  
  // Handle click outside to cancel delete confirmation
  function handleOutsideClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.delete-confirm')) {
      showDeleteConfirm = null;
    }
  }
</script>

<svelte:window on:click={handleOutsideClick} />

<div class="workspace-tabs">
  <div class="tabs-container">
    {#each $workspaces as workspace (workspace.id)}
      <div 
        class="tab"
        class:active={workspace.id === $activeWorkspaceId}
        on:click={() => switchWorkspace(workspace.id)}
        role="button"
        tabindex="0"
        on:keydown={(e) => e.key === 'Enter' && switchWorkspace(workspace.id)}
      >
        <span class="tab-name">{workspace.name}</span>
        {#if $workspaces.length > 1}
          <button 
            class="tab-close"
            on:click|stopPropagation={() => confirmDeleteWorkspace(workspace.id)}
            title="Close workspace"
          >
            ×
          </button>
        {/if}
        
        {#if showDeleteConfirm === workspace.id}
          <div class="delete-confirm" on:click|stopPropagation>
            <div class="confirm-content">
              <p>Delete "{workspace.name}"?</p>
              <div class="confirm-actions">
                <button class="confirm-btn delete" on:click={() => deleteWorkspace(workspace.id)}>
                  Delete
                </button>
                <button class="confirm-btn cancel" on:click={cancelDelete}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        {/if}
      </div>
    {/each}
    
    <button 
      class="add-tab"
      on:click={addWorkspace}
      title="Add new workspace"
    >
      <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
        <path d="M6.5 1.5h-1v4h-4v1h4v4h1v-4h4v-1h-4v-4z"/>
      </svg>
    </button>
    
    <!-- Panel Manager Slot -->
    <div class="panel-manager-slot">
      <slot name="panel-manager" />
    </div>
  </div>
</div>

<style>
  .workspace-tabs {
    background-color: var(--bg-secondary, #252526);
    border-bottom: 1px solid var(--panel-border, #3e3e42);
    padding: 0 8px;
    overflow: hidden;
  }
  
  .tabs-container {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 40px;
    overflow-x: auto;
    overflow-y: hidden;
    scrollbar-width: none;
    -ms-overflow-style: none;
    width: 100%;
  }
  
  .tabs-container::-webkit-scrollbar {
    display: none;
  }
  
  .tab {
    position: relative;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    background-color: transparent;
    border: none;
    color: var(--text-secondary, #858585);
    cursor: pointer;
    white-space: nowrap;
    border-radius: 4px 4px 0 0;
    transition: all 0.2s;
    min-width: 0;
    flex-shrink: 0;
    border-bottom: 2px solid transparent;
  }
  
  .tab:hover {
    background-color: var(--bg-tertiary, #2d2d30);
    color: var(--text-primary, #d4d4d4);
  }
  
  .tab.active {
    background-color: var(--bg-primary, #1e1e1e);
    color: var(--text-primary, #d4d4d4);
    border-bottom-color: var(--accent-color, #0e639c);
  }
  
  .tab-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 120px;
    font-size: 13px;
    font-weight: 500;
  }
  
  .tab-close {
    display: none;
    background: none;
    border: none;
    color: var(--text-secondary, #858585);
    cursor: pointer;
    padding: 2px;
    border-radius: 3px;
    font-size: 16px;
    line-height: 1;
    width: 20px;
    height: 20px;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
  }
  
  .tab:hover .tab-close {
    display: flex;
  }
  
  .tab-close:hover {
    background-color: var(--bg-danger-hover, #5a1d1d);
    color: var(--text-danger, #f48771);
  }
  
  .add-tab {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    background: none;
    border: 1px dashed var(--panel-border, #3e3e42);
    color: var(--text-secondary, #858585);
    cursor: pointer;
    border-radius: 4px;
    margin-left: 8px;
    transition: all 0.2s;
    flex-shrink: 0;
  }
  
  .add-tab:hover {
    background-color: var(--bg-tertiary, #2d2d30);
    border-color: var(--accent-color, #0e639c);
    color: var(--accent-color, #0e639c);
  }
  
  .delete-confirm {
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    z-index: 1000;
    background-color: var(--bg-primary, #1e1e1e);
    border: 1px solid var(--panel-border, #3e3e42);
    border-radius: 6px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    padding: 12px;
    white-space: nowrap;
    margin-top: 4px;
  }
  
  .delete-confirm::before {
    content: '';
    position: absolute;
    top: -6px;
    left: 50%;
    transform: translateX(-50%);
    width: 0;
    height: 0;
    border-left: 6px solid transparent;
    border-right: 6px solid transparent;
    border-bottom: 6px solid var(--panel-border, #3e3e42);
  }
  
  .delete-confirm::after {
    content: '';
    position: absolute;
    top: -5px;
    left: 50%;
    transform: translateX(-50%);
    width: 0;
    height: 0;
    border-left: 5px solid transparent;
    border-right: 5px solid transparent;
    border-bottom: 5px solid var(--bg-primary, #1e1e1e);
  }
  
  .confirm-content p {
    margin: 0 0 8px 0;
    font-size: 12px;
    color: var(--text-primary, #d4d4d4);
  }
  
  .confirm-actions {
    display: flex;
    gap: 6px;
  }
  
  .confirm-btn {
    padding: 4px 8px;
    border: none;
    border-radius: 3px;
    font-size: 11px;
    cursor: pointer;
    transition: background-color 0.2s;
  }
  
  .confirm-btn.delete {
    background-color: var(--bg-danger, #d73a49);
    color: white;
  }
  
  .confirm-btn.delete:hover {
    background-color: var(--bg-danger-hover, #cb2431);
  }
  
  .confirm-btn.cancel {
    background-color: var(--bg-tertiary, #2d2d30);
    color: var(--text-primary, #d4d4d4);
  }
  
  .confirm-btn.cancel:hover {
    background-color: var(--bg-quaternary, #3c3c3c);
  }
  
  .panel-manager-slot {
    margin-left: auto;
    padding-left: 16px;
    flex-shrink: 0;
  }
  
  /* Mobile responsive */
  @media (max-width: 768px) {
    .tab-name {
      max-width: 80px;
    }
    
    .tab {
      padding: 6px 8px;
    }
    
    .add-tab {
      width: 28px;
      height: 28px;
      margin-left: 4px;
    }
  }
</style>