// Comprehensive Prompt Queue Fix and Test
// This script will diagnose and fix the terminal buffer reading issue

console.log('=== PROMPT QUEUE FIX AND TEST ===');
console.log('Time:', new Date().toISOString());

// Helper to wait
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Find Claude terminal using multiple methods
function findClaudeTerminal() {
  console.log('\n--- Finding Claude Terminal ---');

  // Method 1: Global registry
  if (window.morphboxTerminals) {
    const ids = Object.keys(window.morphboxTerminals);
    console.log(`Found ${ids.length} terminals in global registry`);

    for (const id of ids) {
      const terminal = window.morphboxTerminals[id];
      console.log(`Terminal ${id}:`, {
        hasGetBufferContent: !!terminal.getBufferContent,
        hasTerminal: !!terminal.terminal,
        hasSendInput: !!terminal.sendInput
      });

      // Test if this is Claude terminal
      if (terminal.getBufferContent) {
        const content = terminal.getBufferContent();
        if (content.includes('Claude') || content.includes('Human:') ||
            content.includes('Assistant:') || content.length > 100) {
          console.log(`✓ Found Claude terminal: ${id}`);
          return { id, terminal, method: 'global' };
        }
      }
    }
  }

  // Method 2: Find via panels
  const panels = window.allPanels ? window.allPanels : [];
  const claudePanel = panels.find(p => p.type === 'claude');
  if (claudePanel && window.morphboxTerminals && window.morphboxTerminals[claudePanel.id]) {
    console.log('✓ Found Claude terminal via panel lookup');
    return {
      id: claudePanel.id,
      terminal: window.morphboxTerminals[claudePanel.id],
      method: 'panel'
    };
  }

  // Method 3: DOM search
  const containers = document.querySelectorAll('.terminal-container');
  for (const container of containers) {
    if (container._terminal || container.terminal) {
      const term = container._terminal || container.terminal;
      console.log('Found terminal in DOM:', {
        hasBuffer: !!term.buffer,
        hasWrite: !!term.write
      });

      // Create wrapper if needed
      const wrapper = {
        terminal: term,
        getBufferContent: () => {
          if (term.buffer && term.buffer.active) {
            let content = '';
            for (let i = 0; i < term.buffer.active.length; i++) {
              const line = term.buffer.active.getLine(i);
              if (line) {
                content += line.translateToString(true) + '\n';
              }
            }
            return content;
          }
          return '';
        },
        sendInput: (text) => {
          if (term.write) {
            term.write(text);
          }
        }
      };

      const content = wrapper.getBufferContent();
      if (content.includes('Claude') || content.includes('Human:') || content.length > 100) {
        console.log('✓ Found Claude terminal in DOM');
        return { terminal: wrapper, method: 'dom' };
      }
    }
  }

  console.log('✗ Could not find Claude terminal');
  return null;
}

// Real-time terminal content monitor
class TerminalMonitor {
  constructor(terminalInfo) {
    this.terminalInfo = terminalInfo;
    this.terminal = terminalInfo.terminal;
    this.lastContent = '';
    this.lastLength = 0;
    this.stableCount = 0;
    this.changeHistory = [];
    this.promptPatterns = {
      human: false,
      assistant: false,
      promptBox: false,
      tryPrompt: false
    };
  }

  getContent() {
    // Try different methods based on how we found the terminal
    if (this.terminal.getBufferContent) {
      return this.terminal.getBufferContent();
    }

    // Fallback: try to read from xterm buffer directly
    if (this.terminal.terminal && this.terminal.terminal.buffer) {
      const buffer = this.terminal.terminal.buffer.active;
      let content = '';
      for (let i = 0; i < buffer.length; i++) {
        const line = buffer.getLine(i);
        if (line) {
          content += line.translateToString(true) + '\n';
        }
      }
      return content;
    }

    // Last resort: read from DOM
    const containers = document.querySelectorAll('.xterm-screen');
    if (containers.length > 0) {
      return containers[0].textContent || '';
    }

    return '';
  }

  check() {
    const content = this.getContent();
    const changed = content !== this.lastContent;
    const diff = content.length - this.lastLength;

    if (changed) {
      this.changeHistory.push({
        time: Date.now(),
        length: content.length,
        diff: diff,
        last100: content.slice(-100)
      });

      console.log(`[Monitor] Content changed: +${diff} chars, total: ${content.length}`);
      console.log('[Monitor] Last 100 chars:', content.slice(-100));
      this.stableCount = 0;
    } else {
      this.stableCount++;
      if (this.stableCount === 1 || this.stableCount % 3 === 0) {
        console.log(`[Monitor] Content stable for ${this.stableCount} checks (${this.stableCount * 4}s)`);
      }
    }

    // Update patterns
    const lower = content.toLowerCase();
    this.promptPatterns = {
      human: lower.includes('human:'),
      assistant: lower.includes('assistant:'),
      promptBox: (lower.includes('│') && lower.includes('>')) || lower.includes('❯'),
      tryPrompt: lower.includes('try "') || lower.includes("try '"),
      cursor: content.endsWith('▋') || content.endsWith('█')
    };

    this.lastContent = content;
    this.lastLength = content.length;

    return {
      changed,
      stableCount: this.stableCount,
      length: content.length,
      patterns: this.promptPatterns,
      content
    };
  }

  isComplete() {
    const state = this.check();

    // Completion criteria:
    // 1. Content grew significantly (50+ chars)
    // 2. Content is stable for 2+ checks (8+ seconds)
    // 3. We see prompt patterns

    const hasGrown = state.length > this.changeHistory[0]?.length + 50;
    const isStable = state.stableCount >= 2;
    const hasPromptPattern = state.patterns.human ||
                           state.patterns.promptBox ||
                           state.patterns.tryPrompt ||
                           state.patterns.cursor;

    if (hasGrown && isStable && hasPromptPattern) {
      console.log('✓ Response complete!', {
        grown: hasGrown,
        stable: `${state.stableCount} checks`,
        patterns: Object.entries(state.patterns).filter(([k,v]) => v).map(([k]) => k)
      });
      return true;
    }

    // Alternative: if we see "Human:" that's definitive
    if (state.patterns.human && isStable) {
      console.log('✓ Response complete (Human: prompt detected)');
      return true;
    }

    return false;
  }
}

// Test the prompt queue with automated prompts
async function testPromptQueue() {
  console.log('\n=== AUTOMATED PROMPT QUEUE TEST ===\n');

  const TEST_PROMPTS = [
    'What is 2+2?',
    'Say "hello world"',
    'What is the capital of France?'
  ];

  // Step 1: Find Claude terminal
  const claudeInfo = findClaudeTerminal();
  if (!claudeInfo) {
    console.error('✗ Could not find Claude terminal');
    return;
  }

  // Step 2: Set up monitor
  const monitor = new TerminalMonitor(claudeInfo);
  console.log('\n--- Initial Terminal State ---');
  const initialState = monitor.check();
  console.log('Content length:', initialState.length);
  console.log('Patterns detected:', initialState.patterns);

  // Step 3: Add prompts to queue
  console.log('\n--- Adding Test Prompts ---');

  const promptInput = document.querySelector('input[placeholder*="prompt"]');
  const addButton = document.querySelector('button[aria-label="Add prompt"]');

  if (!promptInput || !addButton) {
    console.error('✗ Could not find prompt queue UI');
    return;
  }

  for (const prompt of TEST_PROMPTS) {
    promptInput.value = prompt;
    promptInput.dispatchEvent(new Event('input', { bubbles: true }));
    addButton.click();
    console.log(`Added: "${prompt}"`);
    await wait(500);
  }

  // Step 4: Start the queue
  console.log('\n--- Starting Queue ---');
  const playButton = document.querySelector('button[title="Process queue"]');
  if (!playButton) {
    console.error('✗ Could not find play button');
    return;
  }
  playButton.click();

  // Step 5: Monitor for completion
  console.log('\n--- Monitoring Responses ---\n');

  let promptsCompleted = 0;
  const startTime = Date.now();

  const checkLoop = setInterval(() => {
    const elapsed = Date.now() - startTime;

    if (elapsed > 90000) {
      console.error('✗ Test timed out after 90 seconds');
      clearInterval(checkLoop);
      return;
    }

    if (monitor.isComplete()) {
      promptsCompleted++;
      console.log(`\n✓ Prompt ${promptsCompleted}/${TEST_PROMPTS.length} completed!\n`);

      // Reset monitor for next prompt
      monitor.stableCount = 0;
      monitor.changeHistory = [];

      if (promptsCompleted >= TEST_PROMPTS.length) {
        console.log('=== ALL PROMPTS COMPLETED! ===');
        console.log(`Total time: ${(elapsed/1000).toFixed(1)}s`);
        clearInterval(checkLoop);
      }
    }
  }, 4000); // Check every 4 seconds
}

// Inject fix into the actual PromptQueue component
function injectFix() {
  console.log('\n=== INJECTING FIX INTO PROMPT QUEUE ===');

  // Override the global terminal registry access to ensure it works
  if (window.morphboxTerminals) {
    const originalTerminals = window.morphboxTerminals;

    // Wrap each terminal to ensure getBufferContent works
    for (const id in originalTerminals) {
      const terminal = originalTerminals[id];

      if (!terminal.getBufferContent || typeof terminal.getBufferContent !== 'function') {
        console.log(`Fixing terminal ${id} - adding getBufferContent`);

        // Find the actual xterm instance
        if (terminal.terminal && terminal.terminal.buffer) {
          terminal.getBufferContent = function() {
            const buffer = this.terminal.buffer.active;
            let content = '';
            for (let i = 0; i < buffer.length; i++) {
              const line = buffer.getLine(i);
              if (line) {
                content += line.translateToString(true) + '\n';
              }
            }
            return content;
          };
        }
      }
    }
  }

  console.log('✓ Fix injected');
}

// Manual functions for testing
window.testQueue = testPromptQueue;
window.findClaude = findClaudeTerminal;
window.injectFix = injectFix;

// Auto-inject the fix
injectFix();

console.log('\n=== READY TO TEST ===');
console.log('Commands available:');
console.log('  testQueue()  - Run automated test with 3 prompts');
console.log('  findClaude() - Find and display Claude terminal info');
console.log('  injectFix()  - Re-apply the terminal fix');
console.log('\nRunning automated test in 2 seconds...');

// Auto-run test after 2 seconds
setTimeout(testQueue, 2000);