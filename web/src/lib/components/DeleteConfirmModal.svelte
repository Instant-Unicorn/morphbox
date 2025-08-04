<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { fade } from 'svelte/transition';
  
  export let panelName: string = '';
  
  const dispatch = createEventDispatcher();
  
  function handleConfirm() {
    dispatch('confirm');
  }
  
  function handleCancel() {
    dispatch('cancel');
  }
  
  // Handle escape key
  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      handleCancel();
    }
  }
</script>

<div class="modal-overlay" role="button" tabindex="-1" on:click={handleCancel} on:keydown={handleKeydown}>
  <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-noninteractive-element-interactions -->
  <div class="modal-content" role="dialog" aria-modal="true" on:click|stopPropagation transition:fade={{ duration: 200 }}>
    <div class="modal-header">
      <h3>Delete Custom Panel</h3>
    </div>
    
    <div class="modal-body">
      <p>Are you sure you want to delete <strong>{panelName}</strong>?</p>
      <p class="warning">This action cannot be undone.</p>
    </div>
    
    <div class="modal-footer">
      <button class="btn-secondary" on:click={handleCancel}>
        Cancel
      </button>
      <button class="btn-danger" on:click={handleConfirm}>
        Delete Panel
      </button>
    </div>
  </div>
</div>

<style>
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1001;
    padding: 20px;
  }
  
  .modal-content {
    background-color: var(--bg-primary, #1e1e1e);
    border: 1px solid var(--border-color, #3e3e42);
    border-radius: 8px;
    width: 100%;
    max-width: 400px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  }
  
  .modal-header {
    padding: 20px 24px;
    border-bottom: 1px solid var(--border-color, #3e3e42);
  }
  
  .modal-header h3 {
    margin: 0;
    font-size: 18px;
    color: var(--text-primary, #cccccc);
  }
  
  .modal-body {
    padding: 24px;
  }
  
  .modal-body p {
    margin: 0 0 12px 0;
    color: var(--text-primary, #d4d4d4);
    font-size: 14px;
  }
  
  .modal-body p:last-child {
    margin-bottom: 0;
  }
  
  .modal-body strong {
    color: var(--text-primary, #cccccc);
  }
  
  .warning {
    color: var(--warning-color, #cca700);
    font-size: 13px;
  }
  
  .modal-footer {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 12px;
    padding: 16px 24px;
    border-top: 1px solid var(--border-color, #3e3e42);
  }
  
  .btn-secondary,
  .btn-danger {
    padding: 8px 20px;
    border: none;
    border-radius: 4px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .btn-secondary {
    background-color: var(--button-bg, #3c3c3c);
    color: var(--text-primary, #cccccc);
    border: 1px solid var(--border-color, #3e3e42);
  }
  
  .btn-secondary:hover {
    background-color: var(--button-hover, #484848);
  }
  
  .btn-danger {
    background-color: var(--error-color, #f48771);
    color: #1e1e1e;
  }
  
  .btn-danger:hover {
    background-color: #ff6b4a;
  }
  
  /* Mobile responsive */
  @media (max-width: 768px) {
    .modal-overlay {
      padding: 20px;
    }
    
    .modal-content {
      max-width: 100%;
    }
  }
</style>