#!/usr/bin/env node

/**
 * Automated test harness for MorphBox Prompt Queue
 * Simulates terminal states and tests queue processing
 */

class MockTerminal {
  constructor() {
    this.buffer = '';
    this.state = 'ready'; // ready, processing, complete
    this.promptCount = 0;
  }

  getBufferContent() {
    return this.buffer;
  }

  sendInput(text) {
    console.log(`[Terminal] Received input: ${text.replace('\r', '\\r')}`);
    if (text === '\r') {
      // Enter key pressed
      if (this.state === 'ready') {
        this.state = 'processing';
        // Simulate Claude processing
        setTimeout(() => {
          this.simulateResponse();
        }, 500);
      }
    } else {
      // Add text to buffer
      this.buffer += text;
    }
  }

  simulateResponse() {
    this.promptCount++;
    console.log(`[Terminal] Processing prompt ${this.promptCount}...`);

    // Simulate Claude's response
    this.buffer += `\n\nAssistant: Here's the response to prompt ${this.promptCount}.\n`;

    // After response, show ready prompt again
    setTimeout(() => {
      this.state = 'ready';
      this.buffer += '\n│ > Try "help" for commands\n';
      console.log(`[Terminal] Ready for next prompt (buffer length: ${this.buffer.length})`);
    }, 300);
  }

  setReadyState() {
    this.state = 'ready';
    this.buffer = 'Welcome to Claude\n│ > Try "help" for commands\n';
  }

  setWelcomeState() {
    this.state = 'welcome';
    this.buffer = 'Welcome to Claude Code\n';
  }
}

// Mock store implementation
class MockPromptQueueStore {
  constructor() {
    this.state = {
      items: [],
      isRunning: false,
      currentPromptId: null
    };
    this.listeners = [];
  }

  subscribe(fn) {
    this.listeners.push(fn);
    fn(this.state);
    return () => {
      this.listeners = this.listeners.filter(l => l !== fn);
    };
  }

  get() {
    return this.state;
  }

  update(updater) {
    this.state = updater(this.state);
    this.notify();
  }

  notify() {
    this.listeners.forEach(fn => fn(this.state));
  }

  addPrompt(text) {
    const id = `prompt-${Date.now()}`;
    this.state.items.push({
      id,
      text,
      status: 'pending',
      createdAt: new Date()
    });
    this.notify();
    return id;
  }

  setPromptStatus(id, status) {
    const item = this.state.items.find(i => i.id === id);
    if (item) {
      item.status = status;
      if (status === 'active') {
        this.state.currentPromptId = id;
      }
      this.notify();
    }
  }

  removePrompt(id) {
    this.state.items = this.state.items.filter(i => i.id !== id);
    if (this.state.currentPromptId === id) {
      this.state.currentPromptId = null;
    }
    this.notify();
  }

  start() {
    this.state.isRunning = true;
    this.notify();
  }

  stop() {
    this.state.isRunning = false;
    this.state.currentPromptId = null;
    this.notify();
  }

  getNextPending() {
    return this.state.items.find(i => i.status === 'pending') || null;
  }
}

// Test the prompt queue logic
async function runTests() {
  console.log('=== Starting Prompt Queue Tests ===\n');

  const terminal = new MockTerminal();
  const store = new MockPromptQueueStore();

  // Set up mock globals
  global.window = {
    morphboxTerminals: {
      'claude-panel-1': terminal
    }
  };

  // Mock the panels
  const mockPanels = [
    { id: 'claude-panel-1', type: 'claude' }
  ];

  // Import and test the actual logic
  console.log('Test 1: Ready detection');
  terminal.setReadyState();

  // Test isClaudeReady logic
  const buffer = terminal.getBufferContent().toLowerCase();
  const readyIndicators = [
    buffer.includes('try "'),
    buffer.includes('try \''),
    buffer.includes('bypass permissions'),
    buffer.includes('⏵⏵'),
    buffer.includes('>>'),
    buffer.includes('human:'),
    buffer.includes('│') && buffer.includes('>'),
    buffer.endsWith('>') || buffer.endsWith(':')
  ];

  const isReady = readyIndicators.some(x => x);
  console.log(`  Ready state detected: ${isReady}`);
  console.log(`  Indicators found: ${readyIndicators.map((x, i) => x ? i : null).filter(x => x !== null)}`);

  console.log('\nTest 2: Wake from welcome');
  terminal.setWelcomeState();
  const needsWakeup = buffer.includes('welcome to') && buffer.includes('claude') && !buffer.includes('try');
  console.log(`  Needs wakeup: ${needsWakeup}`);

  console.log('\nTest 3: Queue processing');
  terminal.setReadyState();

  // Add test prompts
  store.addPrompt('First prompt');
  store.addPrompt('Second prompt');
  store.addPrompt('Third prompt');

  store.start();

  // Simulate processing
  let checkCount = 0;
  const processQueue = () => {
    checkCount++;
    console.log(`\n[Check ${checkCount}] Queue state:`, {
      isRunning: store.state.isRunning,
      pending: store.state.items.filter(i => i.status === 'pending').length,
      active: store.state.items.filter(i => i.status === 'active').length,
      completed: store.state.items.filter(i => i.status === 'completed').length
    });

    if (!store.state.isRunning) {
      console.log('  Queue stopped');
      return;
    }

    const active = store.state.items.find(i => i.status === 'active');
    if (active) {
      // Check for completion
      const buffer = terminal.getBufferContent().toLowerCase();
      const hasPrompt = buffer.includes('try "') || buffer.includes('│') && buffer.includes('>');

      if (hasPrompt && terminal.state === 'ready') {
        console.log(`  Prompt ${active.id} completed`);
        store.setPromptStatus(active.id, 'completed');

        // Remove and continue
        setTimeout(() => {
          store.removePrompt(active.id);

          if (store.state.items.some(i => i.status === 'pending')) {
            setTimeout(processQueue, 100);
          } else {
            console.log('  No more prompts, stopping');
            store.stop();
          }
        }, 100);
      } else {
        // Still processing
        setTimeout(processQueue, 500);
      }
      return;
    }

    const next = store.getNextPending();
    if (next) {
      console.log(`  Processing: "${next.text}"`);
      store.setPromptStatus(next.id, 'active');
      terminal.sendInput(next.text);
      terminal.sendInput('\r');

      // Check completion after delay
      setTimeout(processQueue, 1000);
    } else {
      console.log('  No pending prompts');
      store.stop();
    }
  };

  processQueue();

  // Wait for completion
  await new Promise(resolve => {
    const checkComplete = setInterval(() => {
      if (!store.state.isRunning && store.state.items.length === 0) {
        clearInterval(checkComplete);
        resolve();
      }
    }, 100);

    // Timeout after 10 seconds
    setTimeout(() => {
      clearInterval(checkComplete);
      console.log('\n[ERROR] Test timed out!');
      console.log('Final state:', store.state);
      resolve();
    }, 10000);
  });

  console.log('\n=== Tests Complete ===');
  console.log(`Total prompts processed: ${terminal.promptCount}`);
  console.log(`Final queue state:`, store.state);
}

// Run tests
runTests().catch(console.error);