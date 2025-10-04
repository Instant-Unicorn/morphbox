<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { get } from 'svelte/store';
  import { promptQueueStore, type PromptItem, type PromptMode } from './prompt-queue-store';
  import EditPromptModal from './EditPromptModal.svelte';
  import PromptModeEditor from './PromptModeEditor.svelte';
  import { Play, Pause, Trash2, Edit, AlertCircle, Plus, GripVertical, SkipForward, Sliders, Eye, EyeOff, X } from 'lucide-svelte';
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

  // Mode editor state
  let editingMode: Partial<PromptMode> | null = null;
  let isModeEditorOpen = false;
  let isManageModesOpen = false;
  let compactModeDisplay = false; // Toggle for compact mode display in main view

  $: queueItems = $promptQueueStore.items;
  $: isRunning = $promptQueueStore.isRunning;
  $: availableModes = $promptQueueStore.modes.filter(mode => !mode.hidden);
  $: allModes = $promptQueueStore.modes; // All modes including hidden
  $: globalModes = availableModes.filter(mode => mode.isGlobal);

  // Get available terminals with their detected CLI types
  $: availableTerminals = $allPanels
    .filter(panel => panel.type === 'terminal' || panel.type === 'claude')
    .map(panel => {
      const terminal = typeof window !== 'undefined' && window.morphboxTerminals?.[panel.id];
      const cliType = terminal?.cliType || (panel.type === 'claude' ? 'claude' : 'bash');

      return {
        id: panel.id,
        title: panel.title,
        type: panel.type,
        cliType: cliType,
        icon: getCliIcon(cliType)
      };
    });

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
  
  // Get icon for CLI type
  function getCliIcon(cliType: string): string {
    switch(cliType) {
      case 'claude': return '🤖';
      case 'gemini': return '✨';
      case 'codex': return '💻';
      case 'qwen': return '🧠';
      case 'bash': return '⚡';
      default: return '💬';
    }
  }

  // Event-driven approach: listen for AI CLI idle events (Claude, Gemini, Codex, etc.)
  let aiCliIdleHandler: ((event: CustomEvent) => void) | null = null;

  onMount(() => {
    // Don't auto-start monitoring - wait for user to hit play
    console.log('[PromptQueue] Component mounted');

    // Listen for ANY AI CLI idle events
    aiCliIdleHandler = (event: CustomEvent) => {
      const { cliType, panelId, terminalId } = event.detail || {};

      console.log('');
      console.log('🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯');
      console.log('📬 [PromptQueue] RECEIVED AI CLI IDLE EVENT! 📬');
      console.log('🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯');
      console.log(`[PromptQueue] CLI Type: ${cliType}`);
      console.log(`[PromptQueue] Panel ID: ${panelId}`);
      console.log(`[PromptQueue] Terminal ID: ${terminalId}`);
      console.log('[PromptQueue] Queue is running?', isRunning);
      console.log('🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯');
      console.log('');

      // Only process if queue is running
      if (!isRunning) return;

      // Check if we have any active prompts (wait for completion)
      const currentItems = get(promptQueueStore).items;
      const activePrompt = currentItems.find(item => item.status === 'active');

      // Only process if this event is from the terminal we sent to
      if (activePrompt && activePrompt.targetTerminalId === terminalId) {
        console.log('✅ Event matches active prompt target, marking complete');
        console.log(`[PromptQueue] ${cliType} idle, marking active prompt as completed:`, activePrompt.id);
        promptQueueStore.setPromptStatus(activePrompt.id, 'completed');

        // Remove and continue
        setTimeout(() => {
          promptQueueStore.removePrompt(activePrompt.id);
          processNextPrompt();
        }, 500);
      } else if (activePrompt) {
        console.log('⏭️ Event from different terminal, ignoring');
        console.log(`   Active prompt target: ${activePrompt.targetTerminalId}`);
        console.log(`   Event from: ${terminalId}`);
      } else {
        // No active prompt, check if we have pending ones
        const hasPendingPrompts = currentItems.some(item => item.status === 'pending');
        if (hasPendingPrompts) {
          console.log(`[PromptQueue] ${cliType} idle, processing next prompt`);
          processNextPrompt();
        }
      }
    };

    // Listen to both old and new event names for compatibility
    window.addEventListener('claude-idle', aiCliIdleHandler as EventListener);
    window.addEventListener('ai-cli-idle', aiCliIdleHandler as EventListener);
  });

  onDestroy(() => {
    // Clean up interval on destroy
    if (claudeCheckInterval) {
      clearInterval(claudeCheckInterval);
    }

    // Clean up event listeners
    if (aiCliIdleHandler) {
      window.removeEventListener('claude-idle', aiCliIdleHandler as EventListener);
      window.removeEventListener('ai-cli-idle', aiCliIdleHandler as EventListener);
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
  

  // Build final prompt with mode instructions
  function buildPromptWithModes(prompt: PromptItem): string {
    let finalPrompt = prompt.text;
    const state = get(promptQueueStore);

    // Collect all active modes for this prompt
    const activeModes: PromptMode[] = [];

    // Add global enabled modes
    state.modes.forEach(mode => {
      if (mode.isGlobal && mode.enabled) {
        activeModes.push(mode);
      }
    });

    // Add prompt-specific modes (if not already in global)
    if (prompt.modeIds) {
      prompt.modeIds.forEach(modeId => {
        const mode = state.modes.find(m => m.id === modeId);
        if (mode && !activeModes.find(m => m.id === mode.id)) {
          activeModes.push(mode);
        }
      });
    }

    // Append mode instructions
    if (activeModes.length > 0) {
      finalPrompt += '\n\n';
      activeModes.forEach(mode => {
        finalPrompt += mode.instruction + ' ';
      });
      finalPrompt = finalPrompt.trim();
    }

    return finalPrompt;
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

    // Find target terminal based on prompt configuration
    let targetTerminal, targetPanelId;

    if (nextPrompt.targetTerminalId) {
      targetTerminal = findTerminalById(nextPrompt.targetTerminalId);
      targetPanelId = nextPrompt.targetTerminalId;

      if (!targetTerminal) {
        console.warn(`[PromptQueue] Target terminal ${nextPrompt.targetTerminalId} not found, falling back to AI CLI`);
        targetTerminal = findAICliTerminal();
        const panels = get(allPanels);
        targetPanelId = panels.find(p =>
          window.morphboxTerminals?.[p.id] === targetTerminal
        )?.id;
      }
    } else {
      // Default behavior: use any AI CLI terminal
      targetTerminal = findAICliTerminal();
      const panels = get(allPanels);
      targetPanelId = panels.find(p =>
        window.morphboxTerminals?.[p.id] === targetTerminal
      )?.id;
    }

    if (!targetTerminal || !targetPanelId) {
      console.error('[PromptQueue] No AI CLI terminal available for sending');
      return;
    }

    // Get CLI type for logging
    const cliType = targetTerminal.cliType || 'unknown';
    console.log(`[PromptQueue] Target terminal: ${targetPanelId} (${cliType})`);

    // Store which terminal we're sending to for idle event matching
    promptQueueStore.setTargetTerminal(nextPrompt.id, targetPanelId);

    // Mark as active
    console.log('[PromptQueue] Marking prompt as active:', nextPrompt.id);
    promptQueueStore.setPromptStatus(nextPrompt.id, 'active');

    // Build final prompt with mode instructions
    const finalPrompt = buildPromptWithModes(nextPrompt);

    // Send the prompt
    console.log(`[PromptQueue] Sending prompt to ${cliType}:`, finalPrompt.substring(0, 50) + '...');
    if (finalPrompt !== nextPrompt.text) {
      console.log('[PromptQueue] Applied modes to prompt');
    }

    // First send the text
    targetTerminal.sendInput(finalPrompt);
    // Then send Enter key separately after a small delay to ensure text is processed
    setTimeout(() => {
      console.log('[PromptQueue] Sending Enter key to submit prompt');
      targetTerminal.sendInput('\r');
    }, 100);

    // With event-driven approach, we just wait for the ai-cli-idle event
    console.log(`[PromptQueue] Prompt sent, waiting for ${cliType} idle event...`);
  }

  // Process next prompt without ready check (for initial start)
  function processNextPromptDirect() {
    console.log('[PromptQueue] Direct processing (no ready check)...');
    const nextPrompt = promptQueueStore.getNextPending();
    if (!nextPrompt) {
      console.log('[PromptQueue] No pending prompts');
      promptQueueStore.stop();
      stopClaudeMonitoring();
      return;
    }

    // Find target terminal (same logic as processNextPrompt)
    let targetTerminal, targetPanelId;

    if (nextPrompt.targetTerminalId) {
      targetTerminal = findTerminalById(nextPrompt.targetTerminalId);
      targetPanelId = nextPrompt.targetTerminalId;

      if (!targetTerminal) {
        targetTerminal = findAICliTerminal();
        const panels = get(allPanels);
        targetPanelId = panels.find(p =>
          window.morphboxTerminals?.[p.id] === targetTerminal
        )?.id;
      }
    } else {
      targetTerminal = findAICliTerminal();
      const panels = get(allPanels);
      targetPanelId = panels.find(p =>
        window.morphboxTerminals?.[p.id] === targetTerminal
      )?.id;
    }

    if (!targetTerminal || !targetPanelId) {
      console.log('[PromptQueue] No AI CLI terminal found');
      // Retry in a moment
      setTimeout(() => checkAndProcessQueue(), 1000);
      return;
    }

    const cliType = targetTerminal.cliType || 'unknown';

    // Store which terminal we're sending to
    promptQueueStore.setTargetTerminal(nextPrompt.id, targetPanelId);

    // Mark as active and send immediately
    console.log(`[PromptQueue] Sending first prompt immediately to ${cliType}:`, nextPrompt.text);
    promptQueueStore.setPromptStatus(nextPrompt.id, 'active');

    // Build final prompt with mode instructions
    const finalPrompt = buildPromptWithModes(nextPrompt);

    // Send the prompt right away
    targetTerminal.sendInput(finalPrompt);
    setTimeout(() => {
      targetTerminal.sendInput('\r');
    }, 100);

    console.log(`[PromptQueue] First prompt sent, waiting for ${cliType} idle event...`);
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
  
  // Find terminal by specific panel ID
  function findTerminalById(terminalId: string) {
    if (typeof window === 'undefined' || !window.morphboxTerminals) return null;

    const panels = get(allPanels);
    const panel = panels.find(p => p.id === terminalId);

    if (!panel) return null;

    // Check if this panel has a terminal registered
    const terminal = window.morphboxTerminals[panel.id];
    return terminal || null;
  }

  // Find ANY AI CLI terminal (Claude, Gemini, Codex, Qwen, etc.)
  function findAICliTerminal() {
    if (typeof window === 'undefined' || !window.morphboxTerminals) return null;

    const panels = get(allPanels);

    // Look for ANY terminal with AI CLI type detected (not bash)
    const aiPanel = panels.find(panel => {
      if (panel.type !== 'terminal' && panel.type !== 'claude') return false;

      const terminal = window.morphboxTerminals[panel.id];
      return terminal && terminal.cliType && terminal.cliType !== 'bash';
    });

    // Fallback to Claude panel if no AI CLI detected yet
    if (!aiPanel) {
      const claudePanel = panels.find(panel => panel.type === 'claude');
      if (claudePanel) {
        return window.morphboxTerminals[claudePanel.id] || null;
      }
    }

    return aiPanel ? window.morphboxTerminals[aiPanel.id] : null;
  }

  // Keep for backward compatibility
  function findClaudeTerminal() {
    return findAICliTerminal();
  }
  
  function handleAddPrompt() {
    if (!inputValue.trim()) return;

    // Find first Claude terminal to use as default
    const claudeTerminal = availableTerminals.find(t => t.cliType === 'claude');
    const defaultTerminalId = claudeTerminal?.id || availableTerminals[0]?.id;

    promptQueueStore.addPrompt(inputValue, defaultTerminalId);
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

  // Mode management handlers
  function handleCreateMode() {
    editingMode = {
      name: '',
      instruction: '',
      emoji: '💡',
      color: '#4ecdc4',
      isGlobal: true,
      enabled: false
    };
    isModeEditorOpen = true;
  }

  function handleEditMode(mode: PromptMode) {
    editingMode = { ...mode };
    isModeEditorOpen = true;
  }

  function handleModeSave(e: CustomEvent<{ mode: Omit<PromptMode, 'id'>; id?: string }>) {
    const { mode, id } = e.detail;

    if (id) {
      // Update existing mode
      promptQueueStore.updateMode(id, mode);
    } else {
      // Create new mode
      promptQueueStore.addMode(mode);
    }

    isModeEditorOpen = false;
    editingMode = null;
  }

  function handleDeleteMode(id: string) {
    if (confirm('Are you sure you want to delete this mode? It will be removed from all prompts.')) {
      promptQueueStore.deleteMode(id);
    }
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

  <!-- Global Modes Section -->
  {#if globalModes.length > 0}
    <div class="global-modes-section">
      <div class="modes-header">
        <span class="modes-label">Prompt Modes</span>
        <div class="modes-actions">
          <button
            type="button"
            class="manage-modes-btn"
            on:click|stopPropagation={() => {
              console.log('Manage modes button clicked!');
              isManageModesOpen = true;
            }}
            title="Manage all modes"
          >
            <Sliders size={14} />
          </button>
          <button
            class="add-mode-btn"
            on:click={handleCreateMode}
            title="Create new prompt mode"
          >
            <Plus size={14} />
          </button>
        </div>
      </div>
      <div class="modes-list">
        {#each globalModes as mode (mode.id)}
          <div class="mode-wrapper">
            <button
              class="mode-badge"
              class:enabled={mode.enabled}
              class:compact={compactModeDisplay}
              style="background-color: {mode.enabled ? mode.color : 'transparent'}; border-color: {mode.color};"
              on:click={() => promptQueueStore.toggleGlobalMode(mode.id)}
              on:contextmenu|preventDefault={() => handleEditMode(mode)}
              title="{mode.instruction}\n\nClick to toggle • Right-click to edit"
            >
              <span class="mode-emoji">{mode.emoji}</span>
              {#if !compactModeDisplay}
                <span class="mode-name">{mode.name}</span>
              {/if}
              {#if mode.enabled}
                <span class="mode-check">✓</span>
              {/if}
            </button>
            <button
              class="mode-delete-btn"
              on:click|stopPropagation={() => promptQueueStore.toggleModeVisibility(mode.id)}
              title="Hide mode (delete in settings to remove permanently)"
            >
              <X size={12} />
            </button>
          </div>
        {/each}
      </div>
    </div>
  {:else}
    <div class="no-modes-section">
      <p class="no-modes-text">No prompt modes configured</p>
      <button class="create-first-mode-btn" on:click={handleCreateMode}>
        <Plus size={16} />
        Create Your First Mode
      </button>
    </div>
  {/if}

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

            <!-- Per-prompt modes -->
            {#if availableModes.length > 0 && item.status === 'pending'}
              <div class="prompt-modes">
                {#each availableModes as mode (mode.id)}
                  {@const isActive = item.modeIds?.includes(mode.id) || (mode.isGlobal && mode.enabled)}
                  <button
                    class="prompt-mode-badge"
                    class:active={isActive}
                    style="border-color: {mode.color}; {isActive ? `background-color: ${mode.color};` : ''}"
                    on:click={() => promptQueueStore.togglePromptMode(item.id, mode.id)}
                    title="{mode.instruction}{mode.isGlobal && mode.enabled ? ' (Auto-applied from global)' : ''}"
                    disabled={mode.isGlobal && mode.enabled}
                  >
                    <span class="prompt-mode-emoji">{mode.emoji}</span>
                    <span class="prompt-mode-name">{mode.name}</span>
                  </button>
                {/each}
              </div>
            {/if}

            <!-- Terminal selector -->
            {#if item.status === 'pending' && availableTerminals.length > 0}
              <div class="terminal-selector">
                <select
                  bind:value={item.targetTerminalId}
                  on:change={() => promptQueueStore.setTargetTerminal(item.id, item.targetTerminalId)}
                  title="Send to terminal"
                  class="terminal-select"
                >
                  {#each availableTerminals as terminal}
                    <option value={terminal.id}>
                      {terminal.icon} {terminal.title}
                      {#if terminal.cliType !== 'bash'}({terminal.cliType}){/if}
                    </option>
                  {/each}
                </select>
              </div>
            {/if}

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

<PromptModeEditor
  mode={editingMode}
  isOpen={isModeEditorOpen}
  on:save={handleModeSave}
  on:close={() => {
    isModeEditorOpen = false;
    editingMode = null;
  }}
/>

<!-- Manage Modes Modal -->
{#if isManageModesOpen}
  <div class="modal-backdrop" on:click={() => isManageModesOpen = false}>
    <div class="manage-modes-modal" on:click|stopPropagation>
      <div class="manage-modes-header">
        <h3>Manage Prompt Modes</h3>
        <div class="header-actions">
          <button
            type="button"
            class="compact-toggle-btn"
            class:active={compactModeDisplay}
            on:click={() => compactModeDisplay = !compactModeDisplay}
            title={compactModeDisplay ? "Show full mode names" : "Show compact mode (emoji only)"}
          >
            {compactModeDisplay ? 'Full' : 'Compact'}
          </button>
          <button
            class="modal-close-btn"
            on:click={() => isManageModesOpen = false}
            title="Close"
          >
            <X size={20} />
          </button>
        </div>
      </div>
      <div class="manage-modes-content">
        {#if allModes.length === 0}
          <p class="no-modes-message">No modes created yet.</p>
        {:else}
          <div class="modes-management-list">
            {#each allModes as mode (mode.id)}
              <div class="manage-mode-item">
                <button
                  class="mode-visibility-toggle"
                  on:click={() => promptQueueStore.toggleModeVisibility(mode.id)}
                  title={mode.hidden ? "Show mode" : "Hide mode"}
                >
                  {#if mode.hidden}
                    <EyeOff size={16} />
                  {:else}
                    <Eye size={16} />
                  {/if}
                </button>
                <div class="mode-info" style="border-color: {mode.color};">
                  <span class="mode-emoji">{mode.emoji}</span>
                  <div class="mode-details">
                    <span class="mode-name" class:hidden={mode.hidden}>{mode.name}</span>
                    <span class="mode-instruction">{mode.instruction}</span>
                  </div>
                </div>
                <button
                  class="manage-mode-delete"
                  on:click={() => promptQueueStore.deleteMode(mode.id)}
                  title="Delete mode permanently"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}

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

  /* Global Modes Styles */
  .global-modes-section {
    padding: 12px 16px;
    border-bottom: 1px solid var(--border-color, #3e3e42);
    background: var(--bg-secondary, #252526);
  }

  .modes-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
  }

  .modes-label {
    font-size: 12px;
    font-weight: 600;
    color: var(--text-secondary, #858585);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .add-mode-btn {
    background: transparent;
    border: 1px solid var(--border-color, #3e3e42);
    color: var(--text-secondary, #858585);
    border-radius: 4px;
    padding: 4px 8px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 11px;
    transition: all 0.2s;
  }

  .add-mode-btn:hover {
    background: var(--hover-bg, rgba(255, 255, 255, 0.1));
    border-color: var(--accent-color, #0e639c);
    color: var(--accent-color, #0e639c);
  }

  .modes-list {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .mode-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    border-radius: 16px;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    border: 2px solid;
    color: var(--text-secondary, #858585);
  }

  .mode-badge.enabled {
    color: white;
  }

  .mode-badge:hover {
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  }

  .mode-badge.compact {
    padding: 6px 8px;
    min-width: 32px;
    justify-content: center;
  }

  .mode-emoji {
    font-size: 16px;
  }

  .mode-name {
    font-size: 12px;
  }

  .mode-check {
    font-size: 14px;
    font-weight: bold;
  }

  .no-modes-section {
    padding: 24px 16px;
    text-align: center;
    border-bottom: 1px solid var(--border-color, #3e3e42);
    background: var(--bg-secondary, #252526);
  }

  .no-modes-text {
    margin: 0 0 12px 0;
    font-size: 13px;
    color: var(--text-secondary, #858585);
  }

  .create-first-mode-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    background: var(--accent-color, #0e639c);
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .create-first-mode-btn:hover {
    background: var(--accent-color-hover, #0d5a8a);
    transform: translateY(-1px);
  }

  /* Per-prompt modes styles */
  .prompt-modes {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 8px;
    margin-bottom: 8px;
  }

  .prompt-mode-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 10px;
    border-radius: 12px;
    font-size: 11px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    border: 1.5px solid;
    background: transparent;
    color: var(--text-secondary, #858585);
  }

  .prompt-mode-badge:disabled {
    cursor: default;
    opacity: 0.7;
  }

  .prompt-mode-badge.active {
    color: white;
  }

  .prompt-mode-badge:not(:disabled):hover {
    transform: scale(1.05);
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.15);
  }

  .prompt-mode-emoji {
    font-size: 13px;
  }

  .prompt-mode-name {
    font-size: 11px;
  }

  /* Terminal selector */
  .terminal-selector {
    margin-top: 8px;
    margin-bottom: 4px;
    display: flex;
    justify-content: flex-end;
  }

  .terminal-select {
    width: auto;
    min-width: 120px;
    max-width: 180px;
    padding: 4px 8px;
    font-size: 11px;
    border-radius: 2px;
    background: var(--bg-secondary, #252526);
    color: var(--text-primary, #cccccc);
    border: 1px solid var(--border-color, #3e3e42);
    cursor: pointer;
    transition: background 0.15s;
  }

  .terminal-select:hover {
    background: var(--bg-hover, #2a2d2e);
    border-color: var(--border-color, #3e3e42);
  }

  .terminal-select:focus {
    outline: none;
    background: var(--bg-hover, #2a2d2e);
    border-color: #4e4e52;
  }

  /* Mode wrapper and delete button */
  .mode-wrapper {
    position: relative;
    display: inline-block;
  }

  .mode-delete-btn {
    position: absolute;
    top: -6px;
    right: -6px;
    display: none;
    background: #ef4444;
    border: 1px solid #dc2626;
    border-radius: 50%;
    width: 20px;
    height: 20px;
    padding: 0;
    cursor: pointer;
    color: white;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
  }

  .mode-wrapper:hover .mode-delete-btn {
    display: flex;
  }

  .mode-delete-btn:hover {
    background: #dc2626;
    transform: scale(1.1);
  }

  /* Mode actions buttons */
  .modes-actions {
    display: flex;
    gap: 4px;
  }

  .manage-modes-btn {
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 4px;
    padding: 4px 6px;
    cursor: pointer;
    color: #94a3b8;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
  }

  .manage-modes-btn:hover {
    background: rgba(255, 255, 255, 0.05);
    color: #e2e8f0;
    border-color: rgba(255, 255, 255, 0.3);
  }

  /* Manage Modes Modal */
  .modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    backdrop-filter: blur(2px);
  }

  .manage-modes-modal {
    background: #1e293b;
    border-radius: 8px;
    width: 500px;
    max-width: 90vw;
    max-height: 70vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
    position: relative;
    z-index: 10001;
  }

  .manage-modes-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }

  .manage-modes-header h3 {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: #e2e8f0;
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .compact-toggle-btn {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: #94a3b8;
    cursor: pointer;
    padding: 6px 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 500;
    transition: all 0.2s;
  }

  .compact-toggle-btn:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #e2e8f0;
    border-color: rgba(255, 255, 255, 0.3);
  }

  .compact-toggle-btn.active {
    background: #3b82f6;
    color: white;
    border-color: #3b82f6;
  }

  .compact-toggle-btn.active:hover {
    background: #2563eb;
    border-color: #2563eb;
  }

  .modal-close-btn {
    background: transparent;
    border: none;
    color: #94a3b8;
    cursor: pointer;
    padding: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    transition: all 0.2s;
  }

  .modal-close-btn:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #e2e8f0;
  }

  .manage-modes-content {
    padding: 16px;
    overflow-y: auto;
    flex: 1;
  }

  .no-modes-message {
    text-align: center;
    color: #64748b;
    padding: 20px;
  }

  .modes-management-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .manage-mode-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    background: rgba(255, 255, 255, 0.03);
    border-radius: 6px;
    transition: all 0.2s;
  }

  .manage-mode-item:hover {
    background: rgba(255, 255, 255, 0.06);
  }

  .mode-visibility-toggle {
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 4px;
    padding: 8px;
    cursor: pointer;
    color: #94a3b8;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
    flex-shrink: 0;
  }

  .mode-visibility-toggle:hover {
    background: rgba(255, 255, 255, 0.05);
    color: #e2e8f0;
    border-color: rgba(255, 255, 255, 0.3);
  }

  .mode-info {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 12px;
    border-left: 3px solid;
    background: rgba(255, 255, 255, 0.02);
    border-radius: 4px;
  }

  .mode-info .mode-emoji {
    font-size: 20px;
  }

  .mode-details {
    display: flex;
    flex-direction: column;
    gap: 4px;
    flex: 1;
  }

  .mode-details .mode-name {
    font-weight: 500;
    color: #e2e8f0;
  }

  .mode-details .mode-name.hidden {
    opacity: 0.5;
    text-decoration: line-through;
  }

  .mode-instruction {
    font-size: 12px;
    color: #94a3b8;
  }

  .manage-mode-delete {
    background: transparent;
    border: 1px solid rgba(239, 68, 68, 0.3);
    border-radius: 4px;
    padding: 8px;
    cursor: pointer;
    color: #ef4444;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
    flex-shrink: 0;
  }

  .manage-mode-delete:hover {
    background: rgba(239, 68, 68, 0.1);
    border-color: #ef4444;
  }
</style>