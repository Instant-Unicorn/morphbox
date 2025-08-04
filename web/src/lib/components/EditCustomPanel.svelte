<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import { fade, slide } from 'svelte/transition';
  
  export let panelId: string;
  export let panelName: string;
  
  const dispatch = createEventDispatcher();
  
  interface PanelMetadata {
    id: string;
    name: string;
    description: string;
    promptHistory: Array<{
      prompt: string;
      timestamp: string;
      type: 'create' | 'morph';
    }>;
    version: string;
    createdAt: string;
    updatedAt: string;
  }
  
  let metadata: PanelMetadata | null = null;
  let morphDescription = '';
  let isMorphing = false;
  let error = '';
  let showHistory = true;
  let loading = true;
  let morphingMessage = '';
  
  onMount(async () => {
    await loadMetadata();
  });
  
  async function loadMetadata() {
    try {
      loading = true;
      const response = await fetch(`/api/custom-panels/metadata/${panelId}`);
      if (response.ok) {
        metadata = await response.json();
        // Ensure promptHistory is always an array
        if (!metadata.promptHistory) {
          metadata.promptHistory = [];
        }
      } else {
        // If metadata endpoint doesn't exist yet, try to get it from localStorage
        const savedPanels = localStorage.getItem('generated-panels');
        if (savedPanels) {
          const panels = JSON.parse(savedPanels);
          if (panels[panelId]) {
            // Create metadata from saved panel
            metadata = {
              id: panelId,
              name: panelName,
              description: panels[panelId].description || '',
              promptHistory: [{
                prompt: panels[panelId].description || '',
                timestamp: new Date().toISOString(),
                type: 'create'
              }],
              version: '1.0.0',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            };
          }
        }
      }
    } catch (err) {
      console.error('Failed to load metadata:', err);
    } finally {
      loading = false;
    }
  }
  
  function close() {
    dispatch('close');
  }
  
  async function morphPanel() {
    if (!morphDescription.trim()) {
      error = 'Please describe the changes you want to make';
      return;
    }
    
    isMorphing = true;
    error = '';
    morphingMessage = 'Morphing panel with Claude...';
    
    try {
      const response = await fetch('/api/custom-panels/morph', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          panelId,
          morphDescription: morphDescription.trim()
        })
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to morph panel');
      }
      
      const result = await response.json();
      
      // Update local metadata
      metadata = result.metadata;
      
      // Clear the input
      morphDescription = '';
      
      // Dispatch success event
      dispatch('morphed', { panelId, metadata: result.metadata });
      
      // Show success message
      error = '';
    } catch (err) {
      error = err instanceof Error ? err.message : 'An error occurred';
      console.error('Failed to morph panel:', err);
    } finally {
      isMorphing = false;
    }
  }
  
  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleString();
  }
  
  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && e.ctrlKey) {
      morphPanel();
    }
  }
  
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
      <h2>Edit Custom Panel: {panelName}</h2>
      <button class="close-button" on:click={close} aria-label="Close">×</button>
    </div>
    
    <div class="modal-body">
      {#if loading}
        <div class="loading">Loading panel history...</div>
      {:else if metadata}
        <div class="version-info">
          <span class="version">Version {metadata.version}</span>
          <span class="updated">Last updated: {formatDate(metadata.updatedAt)}</span>
        </div>
        
        <div class="section">
          <div class="section-header">
            <h3>Prompt History</h3>
            <button 
              class="toggle-button" 
              on:click={() => showHistory = !showHistory}
              aria-label={showHistory ? 'Hide history' : 'Show history'}
            >
              {showHistory ? '−' : '+'}
            </button>
          </div>
          
          {#if showHistory}
            <div class="prompt-history" transition:slide>
              {#each (metadata.promptHistory || []) as item, index}
                <div class="history-item">
                  <div class="history-header">
                    <span class="history-number">{index + 1}.</span>
                    <span class="history-type" class:create={item.type === 'create'}>
                      {item.type === 'create' ? 'Created' : 'Morphed'}
                    </span>
                    <span class="history-date">{formatDate(item.timestamp)}</span>
                  </div>
                  <div class="history-prompt">{item.prompt}</div>
                </div>
              {/each}
            </div>
          {/if}
        </div>
        
        <div class="section morph-section">
          <h3>Morph This Panel</h3>
          
          {#if isMorphing}
            <div class="loading-container" transition:fade>
              <div class="loading-spinner"></div>
              <p class="loading-message">{morphingMessage}</p>
              <p class="loading-note">Claude is updating your panel based on your changes...</p>
            </div>
          {:else}
            {#if error}
              <div class="error-message" transition:fade>
                {error}
              </div>
            {/if}
            
            <div class="form-group">
            <label for="morph-description">Describe Your Changes</label>
            <textarea
              id="morph-description"
              bind:value={morphDescription}
              on:keydown={handleKeydown}
              placeholder="Example: Add a search box at the top that filters the items in real-time as the user types"
              rows="4"
              disabled={isMorphing}
            ></textarea>
            <small>Describe what you want to add, change, or remove. Be specific about functionality and appearance.</small>
          </div>
          {/if}
        </div>
      {:else}
        <div class="no-metadata">
          <p>No metadata found for this panel.</p>
          <p>This might be an older panel created before the metadata system was added.</p>
        </div>
      {/if}
    </div>
    
    <div class="modal-footer">
      <button class="btn-secondary" on:click={close} disabled={isMorphing}>
        Close
      </button>
      {#if metadata}
        <button 
          class="btn-primary" 
          on:click={morphPanel}
          disabled={isMorphing || !morphDescription.trim()}
        >
          {isMorphing ? 'Morphing...' : 'Morph Panel'}
        </button>
      {/if}
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
    max-width: 700px;
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
  
  .loading {
    text-align: center;
    color: var(--text-secondary, #858585);
    padding: 40px;
  }
  
  .version-info {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    background-color: var(--bg-secondary, #252526);
    border-radius: 4px;
    margin-bottom: 24px;
    font-size: 13px;
  }
  
  .version {
    color: var(--accent-color, #4ec9b0);
    font-weight: 500;
  }
  
  .updated {
    color: var(--text-secondary, #858585);
  }
  
  .section {
    margin-bottom: 24px;
  }
  
  .section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
  }
  
  .section h3 {
    margin: 0;
    font-size: 16px;
    color: var(--text-primary, #cccccc);
  }
  
  .toggle-button {
    background: none;
    border: 1px solid var(--border-color, #3e3e42);
    color: var(--text-secondary, #858585);
    width: 24px;
    height: 24px;
    border-radius: 4px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    transition: all 0.2s;
  }
  
  .toggle-button:hover {
    background-color: var(--bg-secondary, #3c3c3c);
    color: var(--text-primary, #cccccc);
  }
  
  .prompt-history {
    background-color: var(--bg-secondary, #252526);
    border: 1px solid var(--border-color, #3e3e42);
    border-radius: 4px;
    padding: 16px;
    max-height: 300px;
    overflow-y: auto;
  }
  
  .history-item {
    margin-bottom: 16px;
    padding-bottom: 16px;
    border-bottom: 1px solid var(--border-color, #3e3e42);
  }
  
  .history-item:last-child {
    margin-bottom: 0;
    padding-bottom: 0;
    border-bottom: none;
  }
  
  .history-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 8px;
  }
  
  .history-number {
    color: var(--text-secondary, #858585);
    font-weight: 500;
  }
  
  .history-type {
    padding: 2px 8px;
    border-radius: 3px;
    font-size: 12px;
    font-weight: 500;
    background-color: var(--bg-tertiary, #3c3c3c);
    color: var(--text-secondary, #858585);
  }
  
  .history-type.create {
    background-color: rgba(78, 201, 176, 0.2);
    color: var(--accent-color, #4ec9b0);
  }
  
  .history-date {
    margin-left: auto;
    font-size: 12px;
    color: var(--text-secondary, #858585);
  }
  
  .history-prompt {
    color: var(--text-primary, #d4d4d4);
    font-size: 14px;
    line-height: 1.5;
  }
  
  .morph-section {
    margin-bottom: 0;
  }
  
  .error-message {
    background-color: rgba(244, 67, 54, 0.1);
    border: 1px solid rgba(244, 67, 54, 0.3);
    color: var(--error-color, #f48771);
    padding: 12px 16px;
    border-radius: 4px;
    margin-bottom: 16px;
    font-size: 14px;
  }
  
  .form-group {
    margin-bottom: 0;
  }
  
  .form-group label {
    display: block;
    margin-bottom: 8px;
    font-size: 14px;
    color: var(--text-primary, #cccccc);
    font-weight: 500;
  }
  
  .form-group textarea {
    width: 100%;
    padding: 10px 14px;
    background-color: var(--input-bg, #3c3c3c);
    border: 1px solid var(--border-color, #3e3e42);
    border-radius: 4px;
    color: var(--text-primary, #d4d4d4);
    font-size: 14px;
    font-family: inherit;
    resize: vertical;
    min-height: 100px;
    line-height: 1.5;
    transition: all 0.2s;
  }
  
  .form-group textarea:focus {
    outline: none;
    border-color: var(--accent-color, #0e639c);
    background-color: var(--input-focus-bg, #2d2d30);
  }
  
  .form-group textarea:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  
  .form-group small {
    display: block;
    margin-top: 6px;
    font-size: 12px;
    color: var(--text-secondary, #858585);
    line-height: 1.4;
  }
  
  .no-metadata {
    text-align: center;
    color: var(--text-secondary, #858585);
    padding: 40px;
  }
  
  .no-metadata p {
    margin: 0 0 12px 0;
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
    padding: 40px 20px;
    text-align: center;
  }
  
  .loading-spinner {
    width: 40px;
    height: 40px;
    border: 3px solid var(--border-color, #3e3e42);
    border-top-color: var(--accent-color, #0e639c);
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 20px;
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  .loading-message {
    font-size: 15px;
    color: var(--text-primary, #cccccc);
    margin: 0 0 10px 0;
    font-weight: 500;
  }
  
  .loading-note {
    font-size: 13px;
    color: var(--text-secondary, #858585);
    margin: 0;
    max-width: 350px;
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
    
    .version-info {
      flex-direction: column;
      align-items: flex-start;
      gap: 4px;
    }
    
    .history-header {
      flex-wrap: wrap;
    }
    
    .history-date {
      margin-left: 0;
      width: 100%;
      margin-top: 4px;
    }
  }
</style>