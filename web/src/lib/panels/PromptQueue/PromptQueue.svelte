<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { get } from 'svelte/store';
  import { promptQueueStore, type PromptItem } from './prompt-queue-store';
  import EditPromptModal from './EditPromptModal.svelte';
  import { Play, Pause, Trash2, Edit, AlertCircle, Plus } from 'lucide-svelte';
  import { allPanels } from '$lib/stores/panels';
  
  let inputValue = '';
  let editingPrompt: PromptItem | null = null;
  let isEditModalOpen = false;
  let deleteConfirmId: string | null = null;
  let claudeCheckInterval: number | null = null;
  let lastTerminalOutput = '';
  
  $: queueItems = $promptQueueStore.items;
  $: isRunning = $promptQueueStore.isRunning;
  
  onMount(() => {
    // Start checking Claude status when component mounts
    startClaudeMonitoring();
  });
  
  onDestroy(() => {
    // Clean up interval on destroy
    if (claudeCheckInterval) {
      clearInterval(claudeCheckInterval);
    }
  });
  
  function startClaudeMonitoring() {
    if (claudeCheckInterval) {
      clearInterval(claudeCheckInterval);
    }
    
    claudeCheckInterval = window.setInterval(() => {
      if (!isRunning) return;
      
      checkAndProcessQueue();
    }, 1000); // Check every second
  }
  
  function checkAndProcessQueue() {
    console.log('[PromptQueue] Checking queue...');
    const claudeTerminal = findClaudeTerminal();
    if (!claudeTerminal) {
      console.log('[PromptQueue] No Claude terminal found');
      return;
    }
    
    console.log('[PromptQueue] Claude terminal found, checking if ready...');
    // Check if Claude is ready (looking for prompt indicator)
    if (isClaudeReady()) {
      console.log('[PromptQueue] Claude is ready, processing next prompt');
      processNextPrompt();
    } else {
      console.log('[PromptQueue] Claude is not ready yet');
    }
  }
  
  function isClaudeReady(): boolean {
    // Get all panels from the store
    const panels = get(allPanels);
    console.log('[PromptQueue] Total panels:', panels.length);
    
    // Find the Claude panel
    const claudePanel = panels.find(panel => panel.type === 'claude');
    if (!claudePanel) {
      console.log('[PromptQueue] No Claude panel found in store');
      return false;
    }
    console.log('[PromptQueue] Found Claude panel:', claudePanel.id);
    
    // Try different ways to find the panel element
    let panelElement = document.getElementById(claudePanel.id);
    if (!panelElement) {
      // Try without panel- prefix
      const idWithoutPrefix = claudePanel.id.replace('panel-', '');
      panelElement = document.getElementById(idWithoutPrefix);
    }
    if (!panelElement) {
      // Try to find by data attribute or class
      panelElement = document.querySelector(`[data-panel-id="${claudePanel.id}"]`);
    }
    if (!panelElement) {
      // Last resort - find any terminal that looks like Claude
      const allTerminalRows = document.querySelectorAll('.xterm-rows');
      console.log('[PromptQueue] Found', allTerminalRows.length, 'terminals total');
      
      // Check each terminal for Claude prompt
      for (const terminalRows of allTerminalRows) {
        // Get all text from this terminal
        const rows = terminalRows.querySelectorAll('div');
        const textLines = [];
        let fullText = '';
        
        for (const row of rows) {
          const rowText = row.textContent || '';
          if (rowText.trim()) {
            textLines.push(rowText);
            fullText += rowText + '\n';
          }
        }
        
        // Check if this is a Claude terminal
        if (fullText.includes('Claude') || fullText.includes('Anthropic') || fullText.includes('MorphBox Terminal')) {
          console.log('[PromptQueue] Found potential Claude terminal with', textLines.length, 'lines');
          if (textLines.length > 0) {
            const lastLine = textLines[textLines.length - 1];
            console.log('[PromptQueue] Checking terminal with last line:', JSON.stringify(lastLine));
            
            if (lastLine.trim() === '>' || lastLine.startsWith('> ')) {
              return true;
            }
          }
        }
      }
      
      console.log('[PromptQueue] No Claude terminal found with ready prompt');
      return false;
    }
    
    // Try to find the actual terminal rows instead of screen
    const terminalRows = panelElement.querySelector('.xterm-rows');
    if (!terminalRows) {
      console.log('[PromptQueue] No xterm-rows found in panel');
      return false;
    }
    
    // Get all row spans and extract text
    const rows = terminalRows.querySelectorAll('div');
    const textLines = [];
    for (const row of rows) {
      const rowText = row.textContent || '';
      // Include empty lines too to get proper line indexing
      textLines.push(rowText);
    }
    
    console.log('[PromptQueue] Found', textLines.length, 'text lines');
    
    // Log all lines for debugging
    if (textLines.length > 0) {
      console.log('[PromptQueue] Terminal content:');
      textLines.forEach((line, index) => {
        console.log(`  Line ${index}: ${JSON.stringify(line)}`);
      });
      
      const lastLine = textLines[textLines.length - 1];
      console.log('[PromptQueue] Last line of terminal:', JSON.stringify(lastLine));
      
      // Claude is ready if the last line starts with ">" and nothing follows
      // Also check if any line is just the prompt
      if (lastLine.trim() === '>' || lastLine.startsWith('> ')) {
        return true;
      }
      
      // Sometimes the prompt appears on its own line
      for (const line of textLines) {
        if (line.trim() === '>') {
          console.log('[PromptQueue] Found standalone prompt on line');
          return true;
        }
      }
      
      // Check if we have the command history section which means Claude is loaded
      // Look for a line that contains just "> " (with space) after the example box
      const hasExampleBox = textLines.some(line => line.includes('│ > Try'));
      if (hasExampleBox) {
        // Look for the last occurrence of a line starting with "> " after the box
        for (let i = textLines.length - 1; i >= 0; i--) {
          const line = textLines[i];
          if (line === '> ' || (line.startsWith('> ') && !line.includes('│'))) {
            console.log('[PromptQueue] Found prompt after example box');
            return true;
          }
        }
      }
      
      // Check if any line after the status bar is empty but followed by the prompt
      // Sometimes there's a blank line between content and the prompt
      const statusBarIndex = textLines.findIndex(line => line.includes('? for shortcuts'));
      if (statusBarIndex >= 0 && statusBarIndex < textLines.length - 1) {
        // Check lines after the status bar
        for (let i = statusBarIndex + 1; i < textLines.length; i++) {
          const line = textLines[i].trim();
          if (line === '>' || line.startsWith('> ')) {
            console.log('[PromptQueue] Found prompt after status bar at line', i);
            return true;
          }
        }
      }
    }
    
    return false;
  }
  
  function processNextPrompt() {
    console.log('[PromptQueue] Processing next prompt...');
    const nextPrompt = promptQueueStore.getNextPending();
    if (!nextPrompt) {
      console.log('[PromptQueue] No pending prompts in queue');
      // No more prompts, check for completed ones to remove
      removeCompletedPrompts();
      return;
    }
    
    console.log('[PromptQueue] Found pending prompt:', nextPrompt.text);
    const claudeTerminal = findClaudeTerminal();
    if (!claudeTerminal) {
      console.log('[PromptQueue] No Claude terminal found for sending');
      return;
    }
    
    // Mark as active
    console.log('[PromptQueue] Marking prompt as active');
    promptQueueStore.setPromptStatus(nextPrompt.id, 'active');
    
    // Send the prompt
    console.log('[PromptQueue] Sending prompt to Claude:', nextPrompt.text);
    claudeTerminal.sendInput(nextPrompt.text + '\n');
    
    // Schedule completion check
    setTimeout(() => {
      checkPromptCompletion(nextPrompt.id);
    }, 3000); // Initial delay before checking
  }
  
  function checkPromptCompletion(promptId: string) {
    const checkInterval = setInterval(() => {
      // If not running anymore, stop checking
      if (!$promptQueueStore.isRunning) {
        clearInterval(checkInterval);
        return;
      }
      
      // Check if Claude is ready again (indicating completion)
      if (isClaudeReady()) {
        clearInterval(checkInterval);
        promptQueueStore.setPromptStatus(promptId, 'completed');
        
        // Process next prompt after a short delay
        setTimeout(() => {
          removeCompletedPrompts();
          if ($promptQueueStore.isRunning) {
            processNextPrompt();
          }
        }, 500);
      }
    }, 1000); // Check every second
    
    // Timeout after 5 minutes
    setTimeout(() => {
      clearInterval(checkInterval);
    }, 300000);
  }
  
  function removeCompletedPrompts() {
    // Remove all completed prompts
    const completed = queueItems.filter(item => item.status === 'completed');
    completed.forEach(item => {
      promptQueueStore.removePrompt(item.id);
    });
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
  
  function handleAddPrompt() {
    if (!inputValue.trim()) return;
    
    promptQueueStore.addPrompt(inputValue);
    inputValue = '';
  }
  
  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAddPrompt();
    }
  }
  
  function toggleRunning() {
    if (isRunning) {
      console.log('[PromptQueue] Stopping queue processing');
      promptQueueStore.stop();
    } else {
      console.log('[PromptQueue] Starting queue processing');
      promptQueueStore.start();
      // Immediately check if we can process
      setTimeout(() => {
        console.log('[PromptQueue] Checking queue after start');
        checkAndProcessQueue();
      }, 100);
    }
  }
  
  function handleEdit(item: PromptItem) {
    editingPrompt = item;
    isEditModalOpen = true;
  }
  
  function handleEditSave(e: CustomEvent<string>) {
    if (editingPrompt) {
      promptQueueStore.updatePrompt(editingPrompt.id, e.detail);
    }
    isEditModalOpen = false;
    editingPrompt = null;
  }
  
  function handleDelete(id: string) {
    deleteConfirmId = id;
  }
  
  function confirmDelete() {
    if (deleteConfirmId) {
      promptQueueStore.removePrompt(deleteConfirmId);
      deleteConfirmId = null;
    }
  }
  
  function cancelDelete() {
    deleteConfirmId = null;
  }
  
  function getStatusClass(status: PromptItem['status']) {
    switch (status) {
      case 'active': return 'status-active';
      case 'completed': return 'status-completed';
      default: return 'status-pending';
    }
  }
</script>

<div class="prompt-queue-container">
  <div class="header">
    <h3>Prompt Queue</h3>
    <button 
      class="control-button"
      class:running={isRunning}
      on:click={toggleRunning}
      title={isRunning ? 'Stop processing' : 'Start processing'}
    >
      {#if isRunning}
        <Pause size={18} />
      {:else}
        <Play size={18} />
      {/if}
    </button>
  </div>
  
  <div class="input-section">
    <textarea
      bind:value={inputValue}
      placeholder="Enter a prompt..."
      on:keydown={handleKeydown}
    />
    <button 
      class="add-button"
      on:click={handleAddPrompt}
      disabled={!inputValue.trim()}
    >
      <Plus size={18} />
    </button>
  </div>
  
  <div class="queue-list">
    {#if queueItems.length === 0}
      <div class="empty-state">
        No prompts in queue
      </div>
    {:else}
      {#each queueItems as item (item.id)}
        <div class="queue-item {getStatusClass(item.status)}">
          <div class="item-content">
            <div class="item-text">{item.text}</div>
            <div class="item-status">{item.status}</div>
          </div>
          <div class="item-actions">
            <button 
              class="action-button"
              on:click={() => handleEdit(item)}
              disabled={item.status !== 'pending'}
              title="Edit prompt"
            >
              <Edit size={16} />
            </button>
            <button 
              class="action-button delete"
              on:click={() => handleDelete(item.id)}
              title="Delete prompt"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      {/each}
    {/if}
  </div>
  
  {#if deleteConfirmId}
    <div class="confirm-dialog">
      <div class="confirm-content">
        <AlertCircle size={20} />
        <p>Are you sure you want to delete this prompt?</p>
        <div class="confirm-actions">
          <button class="button button-secondary" on:click={cancelDelete}>
            Cancel
          </button>
          <button class="button button-danger" on:click={confirmDelete}>
            Delete
          </button>
        </div>
      </div>
    </div>
  {/if}
</div>

<EditPromptModal
  prompt={editingPrompt?.text || ''}
  isOpen={isEditModalOpen}
  on:save={handleEditSave}
  on:close={() => {
    isEditModalOpen = false;
    editingPrompt = null;
  }}
/>

<style>
  .prompt-queue-container {
    display: flex;
    flex-direction: column;
    height: 100%;
    background-color: var(--bg-color, #2d2d30);
    color: var(--text-color, #cccccc);
  }
  
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    border-bottom: 1px solid var(--border-color, #3e3e42);
  }
  
  .header h3 {
    margin: 0;
    font-size: 16px;
    color: var(--panel-title-color, rgb(210, 210, 210));
  }
  
  .control-button {
    background: none;
    border: 1px solid var(--border-color, #3e3e42);
    color: var(--panel-control-color, rgb(210, 210, 210));
    padding: 6px;
    border-radius: 4px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
  }
  
  .control-button:hover {
    background-color: rgba(255, 255, 255, 0.1);
  }
  
  .control-button.running {
    background-color: var(--accent-color, #007acc);
    color: white;
    border-color: var(--accent-color, #007acc);
  }
  
  .input-section {
    display: flex;
    gap: 8px;
    padding: 12px;
    border-bottom: 1px solid var(--border-color, #3e3e42);
  }
  
  textarea {
    flex: 1;
    min-height: 60px;
    max-height: 120px;
    background-color: var(--input-bg, #3c3c3c);
    color: var(--text-color, #cccccc);
    border: 1px solid var(--border-color, #3e3e42);
    border-radius: 4px;
    padding: 8px;
    font-family: inherit;
    font-size: 14px;
    resize: vertical;
  }
  
  textarea:focus {
    outline: none;
    border-color: var(--accent-color, #007acc);
  }
  
  .add-button {
    background-color: var(--accent-color, #007acc);
    color: white;
    border: none;
    border-radius: 4px;
    padding: 8px 12px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background-color 0.2s;
  }
  
  .add-button:hover:not(:disabled) {
    background-color: #0086e6;
  }
  
  .add-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .queue-list {
    flex: 1;
    overflow-y: auto;
    padding: 12px;
  }
  
  .empty-state {
    text-align: center;
    color: var(--text-secondary, #858585);
    padding: 40px 20px;
  }
  
  .queue-item {
    background-color: var(--input-bg, #3c3c3c);
    border: 1px solid var(--border-color, #3e3e42);
    border-radius: 4px;
    padding: 12px;
    margin-bottom: 8px;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    transition: all 0.2s;
  }
  
  .queue-item.status-active {
    background-color: rgba(40, 167, 69, 0.2);
    border-color: rgba(40, 167, 69, 0.5);
  }
  
  .queue-item.status-completed {
    opacity: 0.6;
  }
  
  .item-content {
    flex: 1;
    margin-right: 12px;
  }
  
  .item-text {
    white-space: pre-wrap;
    word-break: break-word;
    margin-bottom: 4px;
  }
  
  .item-status {
    font-size: 12px;
    color: var(--text-secondary, #858585);
    text-transform: capitalize;
  }
  
  .item-actions {
    display: flex;
    gap: 4px;
  }
  
  .action-button {
    background: none;
    border: none;
    color: var(--text-secondary, #858585);
    padding: 4px;
    border-radius: 4px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
  }
  
  .action-button:hover:not(:disabled) {
    background-color: rgba(255, 255, 255, 0.1);
    color: var(--text-color, #cccccc);
  }
  
  .action-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .action-button.delete:hover:not(:disabled) {
    color: #dc3545;
  }
  
  .confirm-dialog {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
  }
  
  .confirm-content {
    background-color: var(--bg-color, #2d2d30);
    border: 1px solid var(--border-color, #3e3e42);
    border-radius: 8px;
    padding: 24px;
    max-width: 300px;
    text-align: center;
  }
  
  .confirm-content p {
    margin: 16px 0;
  }
  
  .confirm-actions {
    display: flex;
    gap: 8px;
    justify-content: center;
  }
  
  .button {
    padding: 8px 16px;
    border-radius: 4px;
    border: none;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .button-secondary {
    background-color: transparent;
    color: var(--text-color, #cccccc);
    border: 1px solid var(--border-color, #3e3e42);
  }
  
  .button-secondary:hover {
    background-color: rgba(255, 255, 255, 0.1);
  }
  
  .button-danger {
    background-color: #dc3545;
    color: white;
  }
  
  .button-danger:hover {
    background-color: #c82333;
  }
</style>