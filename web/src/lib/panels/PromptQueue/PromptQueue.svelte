<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { get } from 'svelte/store';
  import { promptQueueStore, type PromptItem } from './prompt-queue-store';
  import EditPromptModal from './EditPromptModal.svelte';
  import { Play, Pause, Trash2, Edit, AlertCircle, Plus, GripVertical, SkipForward } from 'lucide-svelte';
  import { allPanels } from '$lib/stores/panels';
  
  // Accept panelId prop (passed from GridPanel component)
  export let panelId: string | undefined = undefined;
  
  let inputValue = '';
  let editingPrompt: PromptItem | null = null;
  let isEditModalOpen = false;
  let deleteConfirmId: string | null = null;
  let claudeCheckInterval: number | null = null;
  let lastTerminalOutput = '';
  let draggedItem: PromptItem | null = null;
  let draggedOverIndex: number | null = null;
  
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
    
    // Check if we have any active prompts
    const activePrompt = queueItems.find(item => item.status === 'active');
    if (activePrompt) {
      console.log('[PromptQueue] Active prompt in progress:', activePrompt.text);
      return; // Wait for it to complete
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
  
  let claudeWakeupSent = false;
  let lastWakeupTime = 0;
  
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
    
    // Check if Claude needs to be woken up first
    const terminal = findClaudeTerminal();
    if (!terminal) return false;
    
    // Find all terminals and check for Claude
    const allTerminalRows = document.querySelectorAll('.xterm-rows');
    console.log('[PromptQueue] Checking', allTerminalRows.length, 'terminals');
    
    for (const terminalRows of allTerminalRows) {
      const rows = terminalRows.querySelectorAll('div');
      const textLines = [];
      let fullText = '';
      
      for (const row of rows) {
        const rowText = row.textContent || '';
        textLines.push(rowText);
        fullText += rowText + '\n';
      }
      
      // Check if this looks like Claude terminal or MorphBox terminal that needs Claude to start
      const hasMorphBoxWelcome = fullText.includes('Welcome to MorphBox Terminal') || fullText.includes('Launching Claude...');
      const hasClaudeWelcome = fullText.includes('│ > Try') || fullText.includes('for shortcuts') || fullText.includes('Claude Code');
      
      // Check if Claude is actually running (even without welcome screen)
      const hasClaudeRunning = fullText.includes('Human:') || 
                               fullText.includes('Assistant:') || 
                               fullText.includes('Working directory:') ||
                               fullText.includes('anthropic') ||
                               fullText.includes('Claude');
      
      // More flexible prompt detection - look for any > at end of line or with cursor
      const hasPrompt = textLines.some(line => {
        const trimmed = line.trim();
        // Look for various prompt patterns:
        // - Claude's "Human:" prompt
        // - Standalone >
        // - > with space
        // - > with cursor characters
        // - > at end of line (common pattern)
        return trimmed === 'Human:' ||
               trimmed.startsWith('Human:') ||
               trimmed === '>' || 
               trimmed === '> ' ||
               trimmed.endsWith('>') ||
               (trimmed.startsWith('> ') && !trimmed.includes('│')) ||
               trimmed.includes('> ▋') ||
               trimmed.includes('>▋') ||
               // Also check for common shell prompts that might indicate readiness
               (trimmed.includes('>') && trimmed.length < 10) || // Short lines with > are likely prompts
               // Check if last few characters suggest a prompt
               /[>$#]\s*[▋_|]*$/.test(trimmed) ||
               // Check for Human: prompt with or without cursor
               /Human:\s*[▋_|]*$/.test(trimmed);
      });
      
      // Also check if Claude has started responding (indicating readiness)
      const hasRecentActivity = fullText.includes('Human:') || fullText.includes('Assistant:') || hasPrompt;
      
      if (hasMorphBoxWelcome || hasClaudeWelcome || hasClaudeRunning) {
        console.log('[PromptQueue] Found terminal - MorphBox:', hasMorphBoxWelcome, 'Claude:', hasClaudeWelcome, 'Running:', hasClaudeRunning, 'hasPrompt:', hasPrompt, 'hasActivity:', hasRecentActivity);
        
        // Debug: Log last 5 lines to see what's actually shown
        const lastLines = textLines.slice(-5).filter(line => line.trim());
        console.log('[PromptQueue] Last terminal lines:', lastLines);
        
        // If we see MorphBox welcome screen without Claude, just wait - Claude should start automatically
        if (hasMorphBoxWelcome && !hasClaudeWelcome && !hasClaudeRunning && !hasPrompt && !hasRecentActivity) {
          console.log('[PromptQueue] Waiting for Claude to start automatically...');
          return false; // Not ready yet, just wait
        }
        
        // If Claude is running and we have "Human:" prompt, it's ready
        if (hasClaudeRunning && fullText.includes('Human:')) {
          console.log('[PromptQueue] Claude is ready with Human: prompt');
          return true;
        }
        
        // If we see Claude welcome screen but no prompt, send Enter to wake Claude
        if ((hasClaudeWelcome || hasClaudeRunning) && !hasPrompt && !hasRecentActivity) {
          const now = Date.now();
          // Only send wakeup every 3 seconds max (reduced from 5)
          if (now - lastWakeupTime > 3000) {
            console.log('[PromptQueue] Claude showing welcome screen, sending Enter to wake up');
            terminal.sendInput('\r');
            lastWakeupTime = now;
            claudeWakeupSent = true;
          }
          return false; // Not ready yet
        }
        
        // Consider ready if we have a prompt OR recent activity (more permissive)
        return hasPrompt || hasRecentActivity;
      }
    }
    
    console.log('[PromptQueue] No Claude terminal found with content');
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
    // First send the text
    claudeTerminal.sendInput(nextPrompt.text);
    // Then send Enter key separately after a small delay to ensure text is processed
    setTimeout(() => {
      console.log('[PromptQueue] Sending Enter key');
      claudeTerminal.sendInput('\r');
    }, 100);
    
    // Schedule completion check
    setTimeout(() => {
      checkPromptCompletion(nextPrompt.id);
    }, 2000); // Reduced initial delay before checking
  }
  
  // Manual trigger for when automatic detection fails
  function forceProcessNext() {
    console.log('[PromptQueue] Force processing next prompt...');
    checkAndProcessQueue();
  }
  
  function checkPromptCompletion(promptId: string) {
    let lastCheckTime = Date.now();
    let lastTerminalContent = '';
    let contentStableCount = 0;
    
    const checkInterval = setInterval(() => {
      // If not running anymore, stop checking
      if (!$promptQueueStore.isRunning) {
        clearInterval(checkInterval);
        return;
      }
      
      const currentTime = Date.now();
      
      // Get current terminal content to detect when Claude stops responding
      const terminal = findClaudeTerminal();
      if (terminal) {
        const allTerminalRows = document.querySelectorAll('.xterm-rows');
        let currentContent = '';
        
        for (const terminalRows of allTerminalRows) {
          const rows = terminalRows.querySelectorAll('div');
          for (const row of rows) {
            currentContent += (row.textContent || '') + '\n';
          }
          
          // If this terminal contains Claude-related content, use it
          if (currentContent.includes('Claude') || currentContent.includes('Anthropic') || currentContent.includes('Human:') || currentContent.includes('Assistant:')) {
            break;
          }
        }
        
        // Check if content has stopped changing (indicating completion)
        if (currentContent === lastTerminalContent) {
          contentStableCount++;
        } else {
          contentStableCount = 0;
          lastTerminalContent = currentContent;
        }
        
        // Consider completed if:
        // 1. Claude is ready (has prompt) AND content stable for 2+ checks, OR
        // 2. Content has been stable for 5+ checks (Claude finished responding)
        const isReady = isClaudeReady();
        const isStable = contentStableCount >= 2;
        const isVeryStable = contentStableCount >= 5;
        
        if ((isReady && isStable) || isVeryStable) {
          console.log('[PromptQueue] Prompt completion detected:', promptId, 'ready:', isReady, 'stable:', contentStableCount);
          clearInterval(checkInterval);
          
          // Find the prompt and mark it completed
          const prompt = queueItems.find(item => item.id === promptId);
          if (prompt && prompt.status === 'active') {
            promptQueueStore.setPromptStatus(promptId, 'completed');
            
            // Automatically remove completed prompt after short delay
            setTimeout(() => {
              console.log('[PromptQueue] Auto-removing completed prompt:', promptId);
              promptQueueStore.removePrompt(promptId);
              // The main checkAndProcessQueue will handle processing the next prompt
            }, 1000);
          }
          return;
        }
      }
      
      lastCheckTime = currentTime;
    }, 1500); // Check every 1.5 seconds (slightly slower for stability)
    
    // Timeout after 3 minutes (reduced from 5)
    setTimeout(() => {
      console.log('[PromptQueue] Prompt completion check timeout for:', promptId);
      clearInterval(checkInterval);
      // Mark as completed anyway to avoid blocking the queue
      const prompt = queueItems.find(item => item.id === promptId);
      if (prompt && prompt.status === 'active') {
        promptQueueStore.setPromptStatus(promptId, 'completed');
        // Auto-remove timed out prompts too
        setTimeout(() => {
          promptQueueStore.removePrompt(promptId);
        }, 1000);
      }
    }, 180000);
  }
  
  function removeCompletedPrompts() {
    // Remove all completed prompts - but this is now handled automatically in checkPromptCompletion
    const completed = queueItems.filter(item => item.status === 'completed');
    console.log('[PromptQueue] Found completed prompts to remove:', completed.length);
    
    // Remove with small delays to avoid UI glitches
    completed.forEach((item, index) => {
      setTimeout(() => {
        console.log('[PromptQueue] Removing completed prompt:', item.id, item.text.substring(0, 50) + '...');
        promptQueueStore.removePrompt(item.id);
      }, index * 200); // Stagger removals
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
  
  // Drag and drop handlers
  function handleDragStart(e: DragEvent, item: PromptItem, index: number) {
    if (item.status !== 'pending') {
      e.preventDefault();
      return;
    }
    
    draggedItem = item;
    e.dataTransfer!.effectAllowed = 'move';
    e.dataTransfer!.setData('text/plain', ''); // Required for Firefox
    
    // Add dragging class after a small delay to avoid visual glitches
    setTimeout(() => {
      (e.target as HTMLElement).classList.add('dragging');
    }, 0);
  }
  
  function handleDragEnd(e: DragEvent) {
    (e.target as HTMLElement).classList.remove('dragging');
    draggedItem = null;
    draggedOverIndex = null;
  }
  
  function handleDragOver(e: DragEvent, index: number) {
    e.preventDefault();
    e.dataTransfer!.dropEffect = 'move';
    
    // Only allow dropping on pending items or empty spaces
    const targetItem = queueItems[index];
    if (targetItem && targetItem.status !== 'pending') {
      return;
    }
    
    draggedOverIndex = index;
  }
  
  function handleDragLeave(e: DragEvent) {
    // Only clear if we're leaving the actual drop zone
    const related = e.relatedTarget as HTMLElement;
    if (!related || !related.classList.contains('queue-item')) {
      draggedOverIndex = null;
    }
  }
  
  function handleDrop(e: DragEvent, dropIndex: number) {
    e.preventDefault();
    
    if (!draggedItem) return;
    
    const draggedIndex = queueItems.findIndex(item => item.id === draggedItem!.id);
    if (draggedIndex === -1 || draggedIndex === dropIndex) return;
    
    // Don't allow dropping on active items
    const targetItem = queueItems[dropIndex];
    if (targetItem && targetItem.status !== 'pending') {
      return;
    }
    
    promptQueueStore.reorderItems(draggedIndex, dropIndex);
    
    draggedItem = null;
    draggedOverIndex = null;
  }
</script>

<div class="prompt-queue-container">
  <div class="input-section">
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
    {#if isRunning && queueItems.some(item => item.status === 'pending')}
      <button 
        class="control-button force-button"
        on:click={forceProcessNext}
        title="Force process next prompt (if automatic detection fails)"
      >
        <SkipForward size={18} />
      </button>
    {/if}
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
      {#each queueItems as item, index (item.id)}
        <div 
          class="queue-item {getStatusClass(item.status)}"
          class:drag-over={draggedOverIndex === index}
          class:draggable={item.status === 'pending'}
          draggable={item.status === 'pending'}
          role="listitem"
          on:dragstart={(e) => handleDragStart(e, item, index)}
          on:dragend={handleDragEnd}
          on:dragover={(e) => handleDragOver(e, index)}
          on:dragleave={handleDragLeave}
          on:drop={(e) => handleDrop(e, index)}
        >
          {#if item.status === 'pending'}
            <div class="drag-handle">
              <GripVertical size={16} />
            </div>
          {/if}
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
  
  .control-button {
    background: none;
    border: 1px solid var(--border-color, #3e3e42);
    color: var(--panel-control-color, rgb(210, 210, 210));
    padding: 8px;
    border-radius: 4px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
    height: fit-content;
    align-self: stretch;
  }
  
  .control-button:hover {
    background-color: rgba(255, 255, 255, 0.1);
  }
  
  .control-button.running {
    background-color: var(--accent-color, #007acc);
    color: white;
    border-color: var(--accent-color, #007acc);
  }
  
  .control-button.force-button {
    background-color: rgba(255, 193, 7, 0.2);
    border-color: #ffc107;
    color: #ffc107;
  }
  
  .control-button.force-button:hover {
    background-color: rgba(255, 193, 7, 0.3);
  }
  
  .input-section {
    display: flex;
    gap: 8px;
    padding: 8px;
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
  
  .queue-item.draggable {
    cursor: move;
  }
  
  .queue-item.dragging {
    opacity: 0.5;
  }
  
  .queue-item.drag-over {
    background-color: rgba(0, 122, 204, 0.1);
    border-color: rgba(0, 122, 204, 0.5);
  }
  
  .drag-handle {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 8px;
    color: var(--text-secondary, #858585);
    cursor: grab;
  }
  
  .drag-handle:active {
    cursor: grabbing;
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