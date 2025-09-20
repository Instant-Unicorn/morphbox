<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { get } from 'svelte/store';
  import { promptQueueStore, type PromptItem } from './prompt-queue-store';
  import EditPromptModal from './EditPromptModal.svelte';
  import { Play, Pause, Trash2, Edit, AlertCircle, Plus, GripVertical, SkipForward } from 'lucide-svelte';
  import { allPanels } from '$lib/stores/panels';
  
  // Accept panelId prop (required by panel system, passed from GridPanel component)
  export let panelId: string | undefined = undefined;

  // Use panelId to satisfy the compiler (it's needed for the panel system)
  $: panelId;
  
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
  
  // Event-driven approach: listen for claude-idle events
  let claudeIdleHandler: ((event: CustomEvent) => void) | null = null;

  onMount(() => {
    // Don't auto-start monitoring - wait for user to hit play
    console.log('[PromptQueue] Component mounted');

    // Listen for claude-idle events
    claudeIdleHandler = (event: CustomEvent) => {
      console.log('');
      console.log('🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯');
      console.log('📬 [PromptQueue] RECEIVED CLAUDE-IDLE EVENT! 📬');
      console.log('🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯');
      console.log('[PromptQueue] Event detail:', event.detail);
      console.log('[PromptQueue] Queue is running?', isRunning);
      console.log('🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯');
      console.log('');

      // Only process if queue is running
      if (!isRunning) return;

      // Check if we have any active prompts (wait for completion)
      const currentItems = get(promptQueueStore).items;
      const activePrompt = currentItems.find(item => item.status === 'active');

      if (activePrompt) {
        // Mark the active prompt as complete since Claude is idle
        console.log('[PromptQueue] Claude idle, marking active prompt as completed:', activePrompt.id);
        promptQueueStore.setPromptStatus(activePrompt.id, 'completed');

        // Remove and continue
        setTimeout(() => {
          promptQueueStore.removePrompt(activePrompt.id);
          processNextPrompt();
        }, 500);
      } else {
        // No active prompt, check if we have pending ones
        const hasPendingPrompts = currentItems.some(item => item.status === 'pending');
        if (hasPendingPrompts) {
          console.log('[PromptQueue] Claude idle, processing next prompt');
          processNextPrompt();
        }
      }
    };

    window.addEventListener('claude-idle', claudeIdleHandler as EventListener);
  });

  onDestroy(() => {
    // Clean up interval on destroy
    if (claudeCheckInterval) {
      clearInterval(claudeCheckInterval);
    }

    // Clean up event listener
    if (claudeIdleHandler) {
      window.removeEventListener('claude-idle', claudeIdleHandler as EventListener);
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
      // Must use get() to access store value in callback
      const state = get(promptQueueStore);
      if (!state.isRunning) {
        console.log('[PromptQueue] Queue not running, skipping check');
        return;
      }

      checkAndProcessQueue();
    }, 1000); // Check every second
  }

  function stopClaudeMonitoring() {
    console.log('[PromptQueue] Stopping Claude monitoring');
    if (claudeCheckInterval) {
      clearInterval(claudeCheckInterval);
      claudeCheckInterval = null;
    }
  }
  
  function checkAndProcessQueue() {
    // Checking queue silently

    // Get fresh items from store
    const currentItems = get(promptQueueStore).items;

    // First check if we have any prompts at all
    const hasPendingPrompts = currentItems.some(item => item.status === 'pending');
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
    const activePrompt = currentItems.find(item => item.status === 'active');
    if (activePrompt) {
      // Active prompt in progress, waiting for completion
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

    // Get the terminal content - try getBufferContent first since we have the specific terminal
    let fullText = '';

    // Method 1: Use getBufferContent from the specific Claude terminal
    if (terminal.getBufferContent) {
      fullText = terminal.getBufferContent().toLowerCase();
      console.log('[PromptQueue] isClaudeReady using getBufferContent, length:', fullText.length);
    }
    // Method 2: Fallback - try to find the specific Claude panel's xterm screen
    else {
      // Find the Claude panel's specific terminal container
      const claudePanelElement = document.querySelector(`[data-panel-id="${claudePanel.id}"]`);
      if (claudePanelElement) {
        const screen = claudePanelElement.querySelector('.xterm-screen');
        if (screen) {
          fullText = (screen.textContent || '').toLowerCase();
          console.log('[PromptQueue] isClaudeReady using panel-specific DOM content, length:', fullText.length);
        }
      }
    }

    if (!fullText) {
      console.log('[PromptQueue] No method to read terminal content');
      return false;
    }

    // Log last 500 chars for debugging
    console.log('[PromptQueue] Claude terminal buffer (last 500 chars):', fullText.slice(-500));
    console.log('[PromptQueue] Buffer length:', fullText.length);

    // Check for input cursor/active prompt (most reliable indicator)
    // Look for the blinking cursor at the end
    const hasActiveCursor = fullText.endsWith('█') || fullText.endsWith('▊') ||
                            fullText.endsWith('▋') || fullText.endsWith('▌') ||
                            fullText.endsWith('▍') || fullText.endsWith('▎') ||
                            fullText.endsWith('▏');

    if (hasActiveCursor) {
      console.log('[PromptQueue] Claude is ready (detected active cursor)!');
      return true;
    }

    // Check if the last line contains prompt indicators
    const lastLines = fullText.slice(-300);
    const trimmedEnd = fullText.trimEnd();

    // Claude Code specific patterns
    // Most reliable: ends with Human: prompt
    if (trimmedEnd.endsWith('human:') || trimmedEnd.endsWith('h:')) {
      console.log('[PromptQueue] Claude is ready (ends with Human: prompt)!');
      return true;
    }

    // Check for Human: near the end AND we're at the end of output
    const lastFifty = fullText.slice(-50);
    if (lastFifty.includes('human:') &&
        (fullText.endsWith(' ') || fullText.endsWith(':') || fullText.endsWith('\n'))) {
      console.log('[PromptQueue] Claude is ready (Human: near end)!');
      return true;
    }

    // Check for assistant response end patterns - but make sure it's not just "Assistant:" alone
    if (lastLines.includes('assistant:') && lastLines.includes('human:')) {
      console.log('[PromptQueue] Claude is ready (detected complete Assistant-Human cycle)!');
      return true;
    }

    // Claude Code shows "Try" suggestions
    if (lastLines.includes('try "') || lastLines.includes('try \'') ||
        lastLines.includes('try:')) {
      console.log('[PromptQueue] Claude is ready (detected Try suggestion)!');
      return true;
    }

    // Check for bypass permissions or other command prompts
    if (lastLines.includes('bypass permissions') ||
        lastLines.includes('would you like to')) {
      console.log('[PromptQueue] Claude is ready (detected command prompt)!');
      return true;
    }

    // Check for prompt box patterns (fallback)
    if ((lastLines.includes('│') && lastLines.includes('>')) ||
        (lastLines.includes('┃') && lastLines.includes('>'))) {
      console.log('[PromptQueue] Claude is ready (detected prompt box)!');
      return true;
    }

    // Check for arrow indicators or other prompt symbols
    if (lastLines.includes('⏵⏵') || lastLines.includes('>>') ||
        lastLines.includes('❯')) {
      console.log('[PromptQueue] Claude is ready (detected prompt arrows)!');
      return true;
    }

    // Check if terminal ends with common prompt patterns (but avoid ellipsis)
    if (!trimmedEnd.endsWith('...') &&
        (trimmedEnd.endsWith('>') || trimmedEnd.endsWith('?') || trimmedEnd.endsWith('$'))) {
      console.log('[PromptQueue] Possible prompt detected (ends with prompt char)');
      return true; // Let the stability check confirm
    }

    // IMPORTANT: If we have substantial content from previous interactions, Claude is likely ready
    // This helps when continuing after timeout completion
    if (fullText.length > 5000 && (fullText.includes('assistant:') || fullText.includes('human:'))) {
      console.log('[PromptQueue] Claude appears ready (has substantial content from previous interactions)');
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

    console.log('[PromptQueue] Claude is not ready yet (no prompt indicators found)');
    return false;
  }
  
  
  function processNextPrompt() {
    console.log('[PromptQueue] Processing next prompt...');
    const nextPrompt = promptQueueStore.getNextPending();
    if (!nextPrompt) {
      console.log('[PromptQueue] No pending prompts in queue');
      // No more prompts, stop the queue
      promptQueueStore.stop();
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

    // With event-driven approach, we just wait for the claude-idle event
    console.log('[PromptQueue] Prompt sent, waiting for claude-idle event...');
  }

  // Process next prompt without ready check (for initial start)
  function processNextPromptDirect() {
    console.log('[PromptQueue] Direct processing (no ready check)...');
    console.error('[BUILD TEST V5] processNextPromptDirect CALLED - should start monitoring');
    const nextPrompt = promptQueueStore.getNextPending();
    if (!nextPrompt) {
      console.log('[PromptQueue] No pending prompts');
      promptQueueStore.stop();
      stopClaudeMonitoring();
      return;
    }

    const claudeTerminal = findClaudeTerminal();
    if (!claudeTerminal) {
      console.log('[PromptQueue] No Claude terminal found');
      // Retry in a moment
      setTimeout(() => checkAndProcessQueue(), 1000);
      return;
    }

    // Mark as active and send immediately
    console.log('[PromptQueue] Sending first prompt immediately:', nextPrompt.text);
    promptQueueStore.setPromptStatus(nextPrompt.id, 'active');

    // Send the prompt right away
    claudeTerminal.sendInput(nextPrompt.text);
    setTimeout(() => {
      claudeTerminal.sendInput('\r');
    }, 100);

    // Start completion monitoring immediately (will poll every 4 seconds)
    console.log('[PromptQueue] Starting completion monitoring for prompt:', nextPrompt.id);
    checkPromptCompletion(nextPrompt.id);
  }
  
  // Manual trigger for when automatic detection fails
  function forceProcessNext() {
    console.log('[PromptQueue] Force processing next prompt...');
    checkAndProcessQueue();
  }
  
  function checkPromptCompletion(promptId: string) {
    console.log('[PromptQueue] checkPromptCompletion called for:', promptId);
    console.error('[BUILD TEST V5] COMPLETION MONITORING STARTED!');
    let lastTerminalContent = '';
    let contentStableCount = 0;
    let lastPromptBoxSeen = false;
    let initialContentLength = 0;

    // Simple fallback: mark complete after 20 seconds regardless
    const timeoutFallback = setTimeout(() => {
      console.log('[PromptQueue] TIMEOUT FALLBACK - marking complete after 20s');
      clearInterval(checkInterval);

      // Mark as complete
      const currentItems = get(promptQueueStore).items;
      const prompt = currentItems.find(item => item.id === promptId);
      if (prompt && prompt.status === 'active') {
        promptQueueStore.setPromptStatus(promptId, 'completed');

        // Remove and continue
        setTimeout(() => {
          promptQueueStore.removePrompt(promptId);
          checkAndProcessQueue();
        }, 500);
      }
    }, 20000);

    // Poll every 4 seconds for completion
    const checkInterval = setInterval(() => {
      // Polling silently every 4 seconds
      // If not running anymore, stop checking
      const state = get(promptQueueStore);
      if (!state.isRunning) {
        clearInterval(checkInterval);
        clearTimeout(timeoutFallback);
        return;
      }

      // Get the Claude panel to find its terminal
      const panels = get(allPanels);
      const claudePanel = panels.find(panel => panel.type === 'claude');
      if (!claudePanel) {
        console.log('[PromptQueue] Claude panel not found');
        return;
      }

      // Get terminal from global registry
      const terminal = window.morphboxTerminals && window.morphboxTerminals[claudePanel.id];
      if (!terminal) {
        console.log('[PromptQueue] Terminal not found in global registry');
        return;
      }

      // Get the terminal content from the specific Claude terminal
      let currentContent = '';

      // Method 1: Use getBufferContent from the specific Claude terminal
      if (terminal.getBufferContent) {
        currentContent = terminal.getBufferContent();
      }
      // Method 3: Read directly from xterm buffer
      else if (terminal.terminal && terminal.terminal.buffer && terminal.terminal.buffer.active) {
        const buffer = terminal.terminal.buffer.active;
        const scrollback = terminal.terminal.buffer.baseY || 0;
        const viewport = terminal.terminal.rows || 24;
        const totalLines = scrollback + viewport;

        for (let i = 0; i <= totalLines; i++) {
          const line = buffer.getLine(i);
          if (line) {
            currentContent += line.translateToString(true) + '\n';
          }
        }
      }

      if (!currentContent) {
        console.log('[PromptQueue] Could not read terminal content');
        return;
      }

      // Enhanced debugging
      console.log('[PromptQueue] Buffer check:', {
        length: currentContent.length,
        lastChar: currentContent[currentContent.length - 1],
        last50: currentContent.slice(-50)
      });

      // Log first check details
      if (contentStableCount === 0 && lastTerminalContent === '') {
        console.log('[PromptQueue] First check - Full content:', currentContent);
      }

      const lowerContent = currentContent.toLowerCase();

      // Track initial content length to detect if response started
      if (initialContentLength === 0) {
        initialContentLength = currentContent.length;
      }

      // Log content periodically for debugging
      if (contentStableCount % 2 === 0) {
        console.log('[PromptQueue] Checking completion, content length:', currentContent.length,
                    'stable count:', contentStableCount);
        console.log('[PromptQueue] Last 300 chars:', currentContent.slice(-300));
      }

      // More comprehensive prompt detection
      const lastLines = lowerContent.slice(-500);
      let hasPromptBox = false;

      // Check for various prompt indicators - Claude Code specific
      if (lastLines.includes('human:') || lastLines.includes('h:') ||
          (lastLines.includes('assistant:') && contentStableCount > 0) ||
          lastLines.includes('try "') || lastLines.includes('try \'') ||
          lastLines.includes('would you like to') ||
          lastLines.includes('bypass permissions') ||
          lastLines.includes('│ > ') || lastLines.includes('❯') ||
          lastLines.includes('⏵⏵') || lastLines.includes('>>')) {
        hasPromptBox = true;
      }

      // Special case: if we see "Human:" it's definitely ready
      if (lastLines.includes('human:')) {
        console.log('[PromptQueue] Detected Human: prompt - definitely complete');
        hasPromptBox = true;
      }

      // Check if content has stopped changing
      if (currentContent === lastTerminalContent) {
        contentStableCount++;
        console.log('[PromptQueue] Content unchanged, stable count:', contentStableCount);
      } else {
        // Content changed - check if significant change
        const diff = currentContent.length - lastTerminalContent.length;
        if (diff > 0) {
          console.log('[PromptQueue] Content grew by', diff, 'chars');
          contentStableCount = 0;
        } else if (diff < 0) {
          // Content shrunk? Might be clearing
          console.log('[PromptQueue] Content shrunk by', Math.abs(diff), 'chars');
          contentStableCount = 0;
        }
        lastTerminalContent = currentContent;
      }

      // Simple completion detection:
      // 1. Content must have grown since we started (response received)
      // 2. Content must be stable for at least 2 checks (8 seconds)
      // 3. We see a prompt pattern OR it's been stable for 3+ checks

      const hasGrown = currentContent.length > initialContentLength + 100;
      const isStable = contentStableCount >= 2;
      const veryStable = contentStableCount >= 3;
      const hasHumanPrompt = lowerContent.includes('human:');

      // Log the state
      if (contentStableCount === 1 || contentStableCount % 2 === 0) {
        console.log('[PromptQueue] State:', {
          grown: hasGrown ? `+${currentContent.length - initialContentLength}` : 'no',
          stable: contentStableCount,
          hasPrompt: hasPromptBox || hasHumanPrompt
        });
      }

      // Consider completed if:
      // 1. We see "Human:" (definitive)
      // 2. Content grew and is stable with prompt indicators
      // 3. Content grew and is very stable (fallback)
      if (hasHumanPrompt || (hasGrown && isStable && hasPromptBox) || (hasGrown && veryStable)) {
        console.log('[PromptQueue] Prompt completion detected:', promptId,
          'hasGrown:', hasGrown,
          'hasHumanPrompt:', hasHumanPrompt,
          'hasPromptBox:', hasPromptBox,
          'stable:', contentStableCount);
        clearInterval(checkInterval);
        clearTimeout(timeoutFallback);

          // Find the prompt and mark it completed
          const currentItems = get(promptQueueStore).items;
          const prompt = currentItems.find(item => item.id === promptId);
          if (prompt && prompt.status === 'active') {
            promptQueueStore.setPromptStatus(promptId, 'completed');

            // Check if there are more pending prompts
            const hasPendingPrompts = currentItems.some(item =>
              item.id !== promptId && item.status === 'pending'
            );

            // Automatically remove completed prompt after short delay
            setTimeout(() => {
              console.log('[PromptQueue] Auto-removing completed prompt:', promptId);
              promptQueueStore.removePrompt(promptId);

              // Re-check for pending prompts with fresh data
              const updatedItems = get(promptQueueStore).items;
              const stillHasPending = updatedItems.some(item =>
                item.status === 'pending'
              );

              if (stillHasPending) {
                console.log('[PromptQueue] More prompts pending, continuing...');
                // Wait a bit to ensure Claude is ready for next prompt
                setTimeout(() => {
                  checkAndProcessQueue();
                }, 1000); // Balanced delay
              } else {
                // No more prompts, stop the queue
                console.log('[PromptQueue] No more prompts, stopping queue');
                promptQueueStore.stop();
                stopClaudeMonitoring();

                // Double-check cleanup after a moment
                setTimeout(() => {
                  const finalItems = get(promptQueueStore).items;
                  const completedCount = finalItems.filter(item => item.status === 'completed').length;
                  if (completedCount > 0) {
                    console.log('[PromptQueue] Cleaning up', completedCount, 'completed prompts');
                    removeCompletedPrompts();
                  }
                }, 1000);
              }
            }, 300); // Faster initial response
          }
          return;
        }
    }, 4000); // Poll every 4 seconds

    // Timeout after 2 minutes (reduced from 3)
    setTimeout(() => {
      console.log('[PromptQueue] Prompt completion check timeout for:', promptId);
      clearInterval(checkInterval);
      // Mark as completed anyway to avoid blocking the queue
      const currentItems = get(promptQueueStore).items;
      const prompt = currentItems.find(item => item.id === promptId);
      if (prompt && prompt.status === 'active') {
        console.log('[PromptQueue] Marking timed-out prompt as completed');
        promptQueueStore.setPromptStatus(promptId, 'completed');

        // Auto-remove timed out prompts too
        setTimeout(() => {
          promptQueueStore.removePrompt(promptId);

          // Re-check for pending prompts with fresh data
          const updatedItems = get(promptQueueStore).items;
          const stillHasPending = updatedItems.some(item =>
            item.status === 'pending'
          );

          if (stillHasPending) {
            console.log('[PromptQueue] More prompts pending after timeout, continuing...');
            // Try to process next prompt
            setTimeout(() => {
              checkAndProcessQueue();
            }, 1000);
          } else {
            // No more prompts, stop the queue
            console.log('[PromptQueue] No more prompts after timeout, stopping queue');
            promptQueueStore.stop();
            stopClaudeMonitoring();

            // Final cleanup
            setTimeout(() => {
              const finalItems = get(promptQueueStore).items;
              const completedCount = finalItems.filter(item => item.status === 'completed').length;
              if (completedCount > 0) {
                console.log('[PromptQueue] Final cleanup of', completedCount, 'completed prompts');
                removeCompletedPrompts();
              }
            }, 1000);
          }
        }, 300);
      }
    }, 120000); // 2 minutes timeout
  }
  
  function removeCompletedPrompts() {
    // Remove all completed prompts - but this is now handled automatically in checkPromptCompletion
    const currentItems = get(promptQueueStore).items;
    const completed = currentItems.filter(item => item.status === 'completed');
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
      // No need to stop monitoring - we're event-driven now
    } else {
      console.log('[PromptQueue] Starting queue processing - EVENT-DRIVEN VERSION');
      promptQueueStore.start();

      // Send the first prompt immediately
      const nextPrompt = promptQueueStore.getNextPending();
      if (nextPrompt) {
        console.log('[PromptQueue] Starting with prompt:', nextPrompt.text);
        // Process immediately without ready check
        processNextPromptDirect();
      } else {
        console.log('[PromptQueue] No prompts to process');
        promptQueueStore.stop();
      }
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