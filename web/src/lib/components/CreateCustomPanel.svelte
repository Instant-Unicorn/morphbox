<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { fade } from 'svelte/transition';
  
  const dispatch = createEventDispatcher();
  
  let panelName = '';
  let panelDescription = '';
  let isCreating = false;
  let error = '';
  let loadingMessage = '';
  
  // Close modal
  function close() {
    dispatch('close');
  }
  
  // Create panel
  async function createPanel() {
    if (!panelName.trim() || !panelDescription.trim()) {
      error = 'Please provide both a name and description';
      return;
    }
    
    isCreating = true;
    error = '';
    loadingMessage = 'Generating panel with Claude...';
    
    try {
      const response = await fetch('/api/custom-panels/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: panelName.trim(),
          description: panelDescription.trim()
        })
      });
      
      if (!response.ok) {
        const data = await response.json();
        console.error('Panel creation failed:', response.status, data);
        
        // Build error message with details
        let errorMsg = data.error || 'Failed to create panel';
        if (data.details) {
          errorMsg += '. ' + data.details;
        }
        
        throw new Error(errorMsg);
      }
      
      const result = await response.json();
      
      // Dispatch success event
      dispatch('created', { panel: result });
      
      // Give a small delay to ensure files are written
      setTimeout(() => {
        // Close modal
        close();
      }, 500);
    } catch (err) {
      error = err instanceof Error ? err.message : 'An error occurred';
      console.error('Failed to create panel - Full error:', err);
      isCreating = false;
      // Don't close on error - let user see the message
    }
  }
  
  // Handle Enter key in description
  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && e.ctrlKey) {
      createPanel();
    }
  }
  
  // Handle escape key
  function handleEscape(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      close();
    }
  }
</script>

<div class="modal-overlay" role="button" tabindex="-1" on:click={close} on:keydown={handleEscape}>
  <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-noninteractive-element-interactions -->
  <div class="modal-content" role="dialog" aria-modal="true" on:click|stopPropagation transition:fade={{ duration: 200 }}>
    <div class="modal-header">
      <h2>Create Custom Panel</h2>
      <button class="close-button" on:click={close} aria-label="Close">×</button>
    </div>
    
    <div class="modal-body">
      {#if isCreating}
        <div class="loading-container" transition:fade>
          <div class="loading-spinner"></div>
          <p class="loading-message">{loadingMessage}</p>
          <p class="loading-note">This may take a few moments as Claude generates your custom panel...</p>
        </div>
      {:else}
        {#if error}
          <div class="error-message" transition:fade>
            {error}
          </div>
        {/if}
      
      <div class="form-group">
        <label for="panel-name">Panel Name</label>
        <input
          id="panel-name"
          type="text"
          bind:value={panelName}
          placeholder="e.g., Task Manager"
          maxlength="50"
          disabled={isCreating}
          autocomplete="off"
        />
        <small>A short, descriptive name for your panel</small>
      </div>
      
      <div class="form-group">
        <label for="panel-description">Description (First Prompt)</label>
        <textarea
          id="panel-description"
          bind:value={panelDescription}
          on:keydown={handleKeydown}
          placeholder="Describe what this panel should do...&#10;&#10;Example: Create a task management panel that shows a list of tasks with checkboxes, allows adding new tasks, marking them complete, and deleting them. Include local storage persistence."
          rows="6"
          disabled={isCreating}
        ></textarea>
        <small>This will be the first prompt used to generate your panel. Be specific about features and functionality.</small>
      </div>
      {/if}
    </div>
    
    <div class="modal-footer">
      <button class="btn-secondary" on:click={close} disabled={isCreating}>
        Cancel
      </button>
      <button 
        class="btn-primary" 
        on:click={createPanel}
        disabled={isCreating || !panelName.trim() || !panelDescription.trim()}
      >
        {isCreating ? 'Creating...' : 'Create Panel'}
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
    z-index: 1000;
    padding: 20px;
  }
  
  .modal-content {
    background-color: var(--bg-primary, #1e1e1e);
    border: 1px solid var(--border-color, #3e3e42);
    border-radius: 8px;
    width: 100%;
    max-width: 600px;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  }
  
  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px 24px;
    border-bottom: 1px solid var(--border-color, #3e3e42);
  }
  
  .modal-header h2 {
    margin: 0;
    font-size: 20px;
    color: var(--text-primary, #cccccc);
  }
  
  .close-button {
    background: none;
    border: none;
    font-size: 24px;
    color: var(--text-secondary, #858585);
    cursor: pointer;
    padding: 0;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    transition: background-color 0.2s;
  }
  
  .close-button:hover {
    background-color: var(--bg-secondary, #3c3c3c);
    color: var(--text-primary, #cccccc);
  }
  
  .modal-body {
    flex: 1;
    padding: 24px;
    overflow-y: auto;
  }
  
  .error-message {
    background-color: rgba(244, 67, 54, 0.1);
    border: 1px solid rgba(244, 67, 54, 0.3);
    color: var(--error-color, #f48771);
    padding: 12px 16px;
    border-radius: 4px;
    margin-bottom: 20px;
    font-size: 14px;
  }
  
  .form-group {
    margin-bottom: 24px;
  }
  
  .form-group:last-child {
    margin-bottom: 0;
  }
  
  .form-group label {
    display: block;
    margin-bottom: 8px;
    font-size: 14px;
    color: var(--text-primary, #cccccc);
    font-weight: 500;
  }
  
  .form-group input,
  .form-group textarea {
    width: 100%;
    padding: 10px 14px;
    background-color: var(--input-bg, #3c3c3c);
    border: 1px solid var(--border-color, #3e3e42);
    border-radius: 4px;
    color: var(--text-primary, #d4d4d4);
    font-size: 14px;
    font-family: inherit;
    transition: all 0.2s;
  }
  
  .form-group input:focus,
  .form-group textarea:focus {
    outline: none;
    border-color: var(--accent-color, #0e639c);
    background-color: var(--input-focus-bg, #2d2d30);
  }
  
  .form-group input:disabled,
  .form-group textarea:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  
  .form-group textarea {
    resize: vertical;
    min-height: 120px;
    line-height: 1.5;
  }
  
  .form-group small {
    display: block;
    margin-top: 6px;
    font-size: 12px;
    color: var(--text-secondary, #858585);
    line-height: 1.4;
  }
  
  .modal-footer {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 12px;
    padding: 16px 24px;
    border-top: 1px solid var(--border-color, #3e3e42);
  }
  
  .btn-primary,
  .btn-secondary {
    padding: 8px 20px;
    border: none;
    border-radius: 4px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .btn-primary {
    background-color: var(--accent-color, #0e639c);
    color: white;
  }
  
  .btn-primary:hover:not(:disabled) {
    background-color: var(--accent-hover, #1177bb);
  }
  
  .btn-primary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .btn-secondary {
    background-color: var(--button-bg, #3c3c3c);
    color: var(--text-primary, #cccccc);
    border: 1px solid var(--border-color, #3e3e42);
  }
  
  .btn-secondary:hover:not(:disabled) {
    background-color: var(--button-hover, #484848);
  }
  
  .btn-secondary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  /* Loading state */
  .loading-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60px 20px;
    text-align: center;
  }
  
  .loading-spinner {
    width: 48px;
    height: 48px;
    border: 3px solid var(--border-color, #3e3e42);
    border-top-color: var(--accent-color, #0e639c);
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 24px;
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  .loading-message {
    font-size: 16px;
    color: var(--text-primary, #cccccc);
    margin: 0 0 12px 0;
    font-weight: 500;
  }
  
  .loading-note {
    font-size: 14px;
    color: var(--text-secondary, #858585);
    margin: 0;
    max-width: 400px;
  }
  
  /* Mobile responsive */
  @media (max-width: 768px) {
    .modal-overlay {
      padding: 0;
      align-items: flex-end;
    }
    
    .modal-content {
      max-width: 100%;
      max-height: 85vh;
      border-radius: 16px 16px 0 0;
      margin: 0;
    }
    
    .modal-body {
      padding: 20px;
    }
  }
</style>