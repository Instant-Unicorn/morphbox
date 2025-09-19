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

  let queueCompletedMessage = '';
  let lastCompletedCount = 0;

  // Track when queue completes all prompts
  $: {
    const pendingCount = queueItems.filter(item => item.status === 'pending').length;
    const completedCount = queueItems.filter(item => item.status === 'completed').length;
    if (!isRunning && completedCount > 0 && pendingCount === 0 &&
        completedCount !== lastCompletedCount) {
      queueCompletedMessage = `✓ Queue completed! ${completedCount} prompt${completedCount > 1 ? 's' : ''} processed.`;
      lastCompletedCount = completedCount;
      // Clear message after 5 seconds
      setTimeout(() => {
        queueCompletedMessage = '';
      }, 5000);
    }
  }
  
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
    console.log('[PromptQueue] Starting Claude monitoring...');
    if (claudeCheckInterval) {
      clearInterval(claudeCheckInterval);
    }

    // Check immediately on start
    setTimeout(() => checkAndProcessQueue(), 100);

    claudeCheckInterval = window.setInterval(() => {
      if (!isRunning) {
        console.log('[PromptQueue] Queue not running, skipping check');
        return;
      }

      checkAndProcessQueue();
    }, 1000); // Check every second
  }
  
  function checkAndProcessQueue() {
    console.log('[PromptQueue] Checking queue...');

    // First check if we have any prompts at all
    const hasPendingPrompts = queueItems.some(item => item.status === 'pending');
    if (!hasPendingPrompts) {
      console.log('[PromptQueue] No pending prompts, stopping queue');
      promptQueueStore.stop();
      stopClaudeMonitoring();
      return;
    }

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

    // Get the terminal instance from global registry
    const terminal = window.morphboxTerminals && window.morphboxTerminals[claudePanel.id];
    if (!terminal) {
      console.log('[PromptQueue] No terminal found for Claude panel:', claudePanel.id);
      return false;
    }

    // Get the terminal buffer content
    let fullText = '';
    if (terminal.getBufferContent) {
      fullText = terminal.getBufferContent().toLowerCase();
      // Log first 500 chars of text for debugging
      console.log('[PromptQueue] Claude terminal buffer (first 500 chars):', fullText.substring(0, 500));
    } else {
      console.log('[PromptQueue] Terminal does not have getBufferContent method');
      return false;
    }

    // Simple reliable checks on the terminal buffer text
    // Claude is ready if we see the "try" text with quotes around the suggestion
    if (fullText.includes('try "') || fullText.includes('try \'')) {
      console.log('[PromptQueue] Claude is ready (detected Try with quote)!');
      return true;
    }

    // Also check for "bypass permissions" indicator
    if (fullText.includes('bypass permissions')) {
      console.log('[PromptQueue] Claude is ready (detected bypass permissions)!');
      return true;
    }

    // Check for the arrow indicators that appear with the prompt
    if (fullText.includes('⏵⏵')) {
      console.log('[PromptQueue] Claude is ready (detected arrow indicators)!');
      return true;
    }

    // Also ready if we see the Human: prompt
    if (fullText.includes('human:')) {
      console.log('[PromptQueue] Claude is ready with Human: prompt');
      return true;
    }

    // Check for common Claude prompt patterns
    if (fullText.includes('│') && fullText.includes('>')) {
      console.log('[PromptQueue] Claude is ready (detected prompt box)!');
      return true;
    }

    // If we see welcome screen but not the try prompt, wake it up
    if ((fullText.includes('welcome to') && fullText.includes('claude')) && !fullText.includes('try')) {
      const now = Date.now();
      // Only send wakeup every 3 seconds to avoid spam
      if (now - lastWakeupTime > 3000) {
        console.log('[PromptQueue] Claude showing welcome screen, sending Enter to wake up');
        terminal.sendInput('\r');
        lastWakeupTime = now;
      }
      return false;
    }

    console.log('[PromptQueue] Claude is not ready yet');
    return false;
  }
  
  
  function processNextPrompt() {
    console.log('[PromptQueue] Processing next prompt...');
    const nextPrompt = promptQueueStore.getNextPending();
    if (!nextPrompt) {
      console.log('[PromptQueue] No pending prompts in queue');
      // No more prompts, stop the queue
      promptQueueStore.stop();
      stopClaudeMonitoring();
      // Clean up any completed prompts
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
    console.log('[PromptQueue] Marking prompt as active:', nextPrompt.id);
    promptQueueStore.setPromptStatus(nextPrompt.id, 'active');

    // Send the prompt
    console.log('[PromptQueue] Sending prompt to Claude:', nextPrompt.text.substring(0, 50) + '...');
    // First send the text
    claudeTerminal.sendInput(nextPrompt.text);
    // Then send Enter key separately after a small delay to ensure text is processed
    setTimeout(() => {
      console.log('[PromptQueue] Sending Enter key to submit prompt');
      claudeTerminal.sendInput('\r');
    }, 100);

    // Schedule completion check
    console.log('[PromptQueue] Starting completion check in 2 seconds for prompt:', nextPrompt.id);
    setTimeout(() => {
      console.log('[PromptQueue] Beginning completion monitoring for prompt:', nextPrompt.id);
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
    let lastPromptBoxSeen = false;

    const checkInterval = setInterval(() => {
      // If not running anymore, stop checking
      if (!$promptQueueStore.isRunning) {
        clearInterval(checkInterval);
        return;
      }

      const currentTime = Date.now();

      // Get current terminal content to detect when Claude stops responding
      const panels = get(allPanels);
      const claudePanel = panels.find(panel => panel.type === 'claude');

      if (!claudePanel) {
        console.log('[PromptQueue] No Claude panel found during completion check');
        return;
      }

      // Get the terminal instance from global registry
      const terminal = window.morphboxTerminals && window.morphboxTerminals[claudePanel.id];
      if (!terminal || !terminal.getBufferContent) {
        console.log('[PromptQueue] Terminal not found or missing getBufferContent');
        return;
      }

      // Get the terminal buffer content
      let currentContent = terminal.getBufferContent();
      let hasPromptBox = false;

      // Log content periodically for debugging
      if (contentStableCount % 3 === 0) {
        console.log('[PromptQueue] Checking completion, content length:', currentContent.length);
        console.log('[PromptQueue] Last 200 chars:', currentContent.slice(-200));
      }

      // Check if prompt box is visible again in the content
      const lowerContent = currentContent.toLowerCase();
      if (lowerContent.includes('│ > try') ||
          lowerContent.includes('│>') ||
          (lowerContent.includes('│') && lowerContent.includes('>')) ||
          lowerContent.includes('try "') ||
          lowerContent.includes('try \'') ||
          lowerContent.includes('⏵⏵')) {
        hasPromptBox = true;
      }

      // Check if content has stopped changing (indicating completion)
      if (currentContent === lastTerminalContent) {
        contentStableCount++;
      } else {
        contentStableCount = 0;
        lastTerminalContent = currentContent;
      }

      // Check if prompt box has reappeared after being hidden
      const promptBoxReappeared = hasPromptBox && !lastPromptBoxSeen && contentStableCount > 0;
      lastPromptBoxSeen = hasPromptBox;

      // Consider completed if:
      // 1. Prompt box reappeared (Claude is ready for next input)
      // 2. Claude shows Human: prompt
      // 3. Content has been stable for 3+ checks with Claude UI visible
      const hasHumanPrompt = lowerContent.includes('human:');
      const isStable = contentStableCount >= 3;

      if (promptBoxReappeared || hasHumanPrompt || (hasPromptBox && isStable)) {
        console.log('[PromptQueue] Prompt completion detected:', promptId,
          'promptBoxReappeared:', promptBoxReappeared,
          'hasHumanPrompt:', hasHumanPrompt,
          'stable:', contentStableCount);
        clearInterval(checkInterval);
          
          // Find the prompt and mark it completed
          const prompt = queueItems.find(item => item.id === promptId);
          if (prompt && prompt.status === 'active') {
            promptQueueStore.setPromptStatus(promptId, 'completed');

            // Check if there are more pending prompts
            const hasPendingPrompts = queueItems.some(item =>
              item.id !== promptId && item.status === 'pending'
            );

            // Automatically remove completed prompt after short delay
            setTimeout(() => {
              console.log('[PromptQueue] Auto-removing completed prompt:', promptId);
              promptQueueStore.removePrompt(promptId);

              if (hasPendingPrompts) {
                // Wait a bit longer to ensure Claude is ready for next prompt
                setTimeout(() => {
                  checkAndProcessQueue();
                }, 1500); // Increased delay to give Claude time to be ready
              } else {
                // No more prompts, stop the queue
                console.log('[PromptQueue] No more prompts, stopping queue');
                promptQueueStore.stop();
                stopClaudeMonitoring();
              }
            }, 500); // Reduced initial delay for faster response
          }
          return;
        }

      lastCheckTime = currentTime;
    }, 1000); // Check every second for better responsiveness
    
    // Timeout after 3 minutes
    setTimeout(() => {
      console.log('[PromptQueue] Prompt completion check timeout for:', promptId);
      clearInterval(checkInterval);
      // Mark as completed anyway to avoid blocking the queue
      const prompt = queueItems.find(item => item.id === promptId);
      if (prompt && prompt.status === 'active') {
        promptQueueStore.setPromptStatus(promptId, 'completed');

        // Check if there are more pending prompts
        const hasPendingPrompts = queueItems.some(item =>
          item.id !== promptId && item.status === 'pending'
        );

        // Auto-remove timed out prompts too
        setTimeout(() => {
          promptQueueStore.removePrompt(promptId);

          if (hasPendingPrompts) {
            // Try to process next prompt with longer delay
            setTimeout(() => {
              checkAndProcessQueue();
            }, 1500); // Match the same delay as normal completion
          } else {
            // No more prompts, stop the queue
            console.log('[PromptQueue] No more prompts after timeout, stopping queue');
            promptQueueStore.stop();
            stopClaudeMonitoring();
          }
        }, 500); // Match the same initial delay
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
  
  {#if queueCompletedMessage}
    <div class="completion-message">
      {queueCompletedMessage}
    </div>
  {/if}

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

  .completion-message {
    background: #2d5a2d;
    color: #4ade80;
    padding: 12px 16px;
    margin: 8px;
    border-radius: 4px;
    font-size: 14px;
    animation: fadeIn 0.3s ease-in-out;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
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