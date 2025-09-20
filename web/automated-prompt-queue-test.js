// Automated Prompt Queue Test
// This will automatically test the prompt queue without manual intervention

console.log('=== Automated Prompt Queue Test ===');

// Test configuration
const TEST_PROMPTS = [
  'What is 2+2?',
  'What is the capital of France?',
  'Say hello'
];

// Helper to wait
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Helper to find Claude terminal
function findClaudeTerminal() {
  if (!window.morphboxTerminals) {
    console.log('✗ No morphboxTerminals found');
    return null;
  }

  const ids = Object.keys(window.morphboxTerminals);
  console.log(`Found ${ids.length} terminals`);

  // Find the Claude terminal (usually has the most content)
  let claudeTerminal = null;
  let maxContent = 0;

  ids.forEach(id => {
    const terminal = window.morphboxTerminals[id];
    if (terminal.getBufferContent) {
      const content = terminal.getBufferContent();
      if (content.length > maxContent) {
        maxContent = content.length;
        claudeTerminal = { id, terminal, content };
      }
    }
  });

  if (claudeTerminal) {
    console.log(`✓ Found Claude terminal: ${claudeTerminal.id}`);
    console.log(`  Content length: ${claudeTerminal.content.length}`);
  }

  return claudeTerminal;
}

// Monitor terminal content changes
class TerminalMonitor {
  constructor(terminal) {
    this.terminal = terminal;
    this.lastContent = '';
    this.lastLength = 0;
    this.stableCount = 0;
    this.changeLog = [];
  }

  check() {
    const content = this.terminal.getBufferContent();
    const changed = content !== this.lastContent;

    if (changed) {
      const diff = content.length - this.lastLength;
      this.changeLog.push({
        time: Date.now(),
        length: content.length,
        diff: diff,
        lastChars: content.slice(-100)
      });

      console.log(`[Monitor] Content changed: +${diff} chars, total: ${content.length}`);
      this.stableCount = 0;
    } else {
      this.stableCount++;
      if (this.stableCount % 5 === 0) {
        console.log(`[Monitor] Content stable for ${this.stableCount} checks`);
      }
    }

    this.lastContent = content;
    this.lastLength = content.length;

    // Check for completion patterns
    const patterns = {
      humanPrompt: content.includes('Human:'),
      assistantPrompt: content.includes('Assistant:'),
      promptBox: content.includes('│') && content.includes('>'),
      tryPrompt: content.includes('try "') || content.includes("try '"),
      cursor: content.endsWith('▋') || content.endsWith('█')
    };

    return {
      changed,
      stableCount: this.stableCount,
      length: content.length,
      patterns,
      content
    };
  }

  isComplete() {
    const state = this.check();

    // Claude is complete if:
    // 1. Content is stable for 3+ checks (6 seconds)
    // 2. We see Human: or prompt box patterns
    // 3. Content has grown and stabilized

    const hasGrown = state.length > this.changeLog[0]?.length + 50;
    const isStable = state.stableCount >= 3;
    const hasPromptPattern = state.patterns.humanPrompt ||
                            state.patterns.promptBox ||
                            state.patterns.tryPrompt;

    if (hasGrown && isStable && hasPromptPattern) {
      console.log('✓ Response complete!', {
        grown: hasGrown,
        stable: isStable,
        patterns: state.patterns
      });
      return true;
    }

    return false;
  }
}

// Main test function
async function runPromptQueueTest() {
  console.log('\n=== Starting Test Sequence ===\n');

  // Step 1: Find Claude terminal
  console.log('Step 1: Finding Claude terminal...');
  const claudeInfo = findClaudeTerminal();
  if (!claudeInfo) {
    console.error('✗ Could not find Claude terminal. Make sure Claude panel is open.');
    return;
  }

  // Step 2: Create monitor
  console.log('\nStep 2: Setting up terminal monitor...');
  const monitor = new TerminalMonitor(claudeInfo.terminal);

  // Step 3: Add test prompts to queue
  console.log('\nStep 3: Adding test prompts to queue...');

  // Find the prompt queue input and button
  const promptInput = document.querySelector('input[placeholder*="prompt"]');
  const addButton = document.querySelector('button[aria-label="Add prompt"]');

  if (!promptInput || !addButton) {
    console.error('✗ Could not find prompt queue UI elements');
    return;
  }

  for (const prompt of TEST_PROMPTS) {
    promptInput.value = prompt;
    promptInput.dispatchEvent(new Event('input', { bubbles: true }));
    addButton.click();
    console.log(`  Added: "${prompt}"`);
    await wait(500);
  }

  // Step 4: Start the queue
  console.log('\nStep 4: Starting prompt queue...');
  const playButton = document.querySelector('button[title="Process queue"]');
  if (!playButton) {
    console.error('✗ Could not find play button');
    return;
  }
  playButton.click();

  // Step 5: Monitor for completion
  console.log('\nStep 5: Monitoring for responses...\n');

  let promptsCompleted = 0;
  const maxWaitTime = 120000; // 2 minutes max
  const startTime = Date.now();

  const monitorInterval = setInterval(async () => {
    const elapsed = Date.now() - startTime;

    if (elapsed > maxWaitTime) {
      console.error('✗ Test timed out after 2 minutes');
      clearInterval(monitorInterval);
      return;
    }

    // Check if response is complete
    if (monitor.isComplete()) {
      promptsCompleted++;
      console.log(`\n✓ Prompt ${promptsCompleted}/${TEST_PROMPTS.length} completed!\n`);

      if (promptsCompleted >= TEST_PROMPTS.length) {
        console.log('=== ALL PROMPTS COMPLETED SUCCESSFULLY! ===');
        clearInterval(monitorInterval);

        // Show final stats
        console.log('\nTest Statistics:');
        console.log(`- Total time: ${(elapsed / 1000).toFixed(1)}s`);
        console.log(`- Prompts completed: ${promptsCompleted}`);
        console.log(`- Changes detected: ${monitor.changeLog.length}`);
      }
    }
  }, 2000); // Check every 2 seconds
}

// Auto-run the test
console.log('\nTo run the test:');
console.log('1. Make sure Claude terminal is open');
console.log('2. Make sure Prompt Queue panel is visible');
console.log('3. Run: runPromptQueueTest()');

// Make function available globally
window.runPromptQueueTest = runPromptQueueTest;

// Also create a simpler diagnostic
window.checkTerminal = function() {
  const info = findClaudeTerminal();
  if (info) {
    console.log('Terminal content:', info.content.slice(-500));
    return info.content;
  }
  return null;
};