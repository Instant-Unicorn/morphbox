<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { X } from 'lucide-svelte';
  import { get } from 'svelte/store';
  import { allPanels } from '$lib/stores/panels';
  
  export let prompt: string = '';
  export let isOpen: boolean = false;
  
  const dispatch = createEventDispatcher();
  
  let editedPrompt = prompt;
  let isPlanningAhead = false;
  
  $: if (isOpen) {
    editedPrompt = prompt;
  }
  
  function handleSave() {
    dispatch('save', editedPrompt);
    close();
  }
  
  function close() {
    dispatch('close');
    isPlanningAhead = false;
  }
  
  async function handlePlanAhead() {
    isPlanningAhead = true;
    
    try {
      // Find Claude terminal
      const claudeTerminal = findClaudeTerminal();
      if (!claudeTerminal) {
        alert('Claude terminal not found. Please open a Claude panel first.');
        return;
      }
      
      // Send the plan command
      const planCommand = `/plan ${editedPrompt.replace(/\n/g, ' ')}`;
      claudeTerminal.sendInput(planCommand + '\n');
      
      // Wait for response and capture it
      // For now, we'll just show a message
      setTimeout(() => {
        editedPrompt = `[Planning mode output will appear here]\n\n${editedPrompt}`;
        isPlanningAhead = false;
      }, 2000);
      
    } catch (error) {
      console.error('Error in plan ahead:', error);
      alert('Failed to execute plan ahead command');
      isPlanningAhead = false;
    }
  }
  
  function findClaudeTerminal() {
    if (typeof window === 'undefined' || !window.morphboxTerminals) return null;
    
    // Get all panels from the store
    const panels = get(allPanels);
    
    // Look for a Claude panel
    const claudePanel = panels.find(panel => panel.type === 'claude');
    if (!claudePanel) return null;
    
    // Check if this panel has a terminal registered
    const terminal = window.morphboxTerminals[claudePanel.id];
    return terminal || null;
  }
  
  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      close();
    }
  }
</script>

{#if isOpen}
  <div class="modal-backdrop" on:click={close} on:keydown={handleKeydown}>
    <div class="modal" on:click|stopPropagation>
      <div class="modal-header">
        <h3>Edit Prompt</h3>
        <button class="close-button" on:click={close}>
          <X size={20} />
        </button>
      </div>
      
      <div class="modal-body">
        <textarea
          bind:value={editedPrompt}
          placeholder="Enter your prompt here..."
          disabled={isPlanningAhead}
        />
      </div>
      
      <div class="modal-footer">
        <button 
          class="button button-secondary" 
          on:click={handlePlanAhead}
          disabled={isPlanningAhead || !editedPrompt.trim()}
        >
          {isPlanningAhead ? 'Planning...' : 'Plan Ahead'}
        </button>
        <div class="footer-actions">
          <button class="button button-secondary" on:click={close}>
            Cancel
          </button>
          <button 
            class="button button-primary" 
            on:click={handleSave}
            disabled={!editedPrompt.trim()}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }
  
  .modal {
    background-color: var(--bg-color, #2d2d30);
    border: 1px solid var(--border-color, #3e3e42);
    border-radius: 8px;
    width: 90%;
    max-width: 600px;
    max-height: 80vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
  }
  
  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px;
    border-bottom: 1px solid var(--border-color, #3e3e42);
  }
  
  .modal-header h3 {
    margin: 0;
    font-size: 18px;
    color: var(--panel-title-color, rgb(210, 210, 210));
  }
  
  .close-button {
    background: none;
    border: none;
    color: var(--panel-control-color, rgb(210, 210, 210));
    cursor: pointer;
    padding: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    transition: background-color 0.2s;
  }
  
  .close-button:hover {
    background-color: rgba(255, 255, 255, 0.1);
  }
  
  .modal-body {
    flex: 1;
    padding: 16px;
    overflow-y: auto;
  }
  
  textarea {
    width: 100%;
    min-height: 300px;
    background-color: var(--input-bg, #3c3c3c);
    color: var(--text-color, #cccccc);
    border: 1px solid var(--border-color, #3e3e42);
    border-radius: 4px;
    padding: 12px;
    font-family: monospace;
    font-size: 14px;
    resize: vertical;
  }
  
  textarea:focus {
    outline: none;
    border-color: var(--accent-color, #007acc);
  }
  
  textarea:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  
  .modal-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px;
    border-top: 1px solid var(--border-color, #3e3e42);
    gap: 12px;
  }
  
  .footer-actions {
    display: flex;
    gap: 8px;
  }
  
  .button {
    padding: 8px 16px;
    border-radius: 4px;
    border: none;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .button-primary {
    background-color: var(--accent-color, #007acc);
    color: white;
  }
  
  .button-primary:hover:not(:disabled) {
    background-color: #0086e6;
  }
  
  .button-secondary {
    background-color: transparent;
    color: var(--text-color, #cccccc);
    border: 1px solid var(--border-color, #3e3e42);
  }
  
  .button-secondary:hover:not(:disabled) {
    background-color: rgba(255, 255, 255, 0.1);
  }
</style>