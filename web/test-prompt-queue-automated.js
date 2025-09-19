#!/usr/bin/env node

/**
 * Automated test for PromptQueue panel
 * Tests the complete flow without user interaction
 */

// Mock Terminal that simulates Claude Code
class MockClaudeTerminal {
  constructor(panelId = 'claude') {
    this.panelId = panelId;
    this.buffer = 'Welcome to Claude Code!\n\nHuman: ';
    this.state = 'ready';
    this.responseCount = 0;
    this.inputHistory = [];
    this.outputCallbacks = [];
  }

  getBufferContent() {
    return this.buffer;
  }

  sendInput(text) {
    console.log(`  [Terminal] Received input: "${text.replace('\r', '\\r')}"`);
    this.inputHistory.push(text);

    if (text === '\r') {
      if (this.state === 'ready') {
        this.state = 'processing';
        this.processPrompt();
      }
    } else {
      this.buffer += text;
    }
  }

  processPrompt() {
    this.responseCount++;
    const promptNum = this.responseCount;
    const promptText = this.inputHistory[this.inputHistory.length - 2] || 'prompt';

    console.log(`  [Terminal] Processing prompt ${promptNum}: "${promptText}"`);

    // Stage 1: Clear and start response
    setTimeout(() => {
      // Simulate terminal clearing/repositioning
      this.buffer = 'Human: ' + promptText;
      this.notifyOutput();

      // Stage 2: Show assistant response
      setTimeout(() => {
        this.buffer += `\n\nAssistant: Processing "${promptText}"...`;
        this.notifyOutput();

        // Stage 3: Complete response
        setTimeout(() => {
          this.buffer += `\n\nI've completed the task. The answer is ${promptNum * 6}.`;
          this.notifyOutput();

          // Stage 4: Show Human prompt (ready state)
          setTimeout(() => {
            this.buffer += '\n\nHuman: ';
            this.state = 'ready';
            console.log(`  [Terminal] Ready for next prompt (response ${promptNum} complete)`);
            this.notifyOutput();
          }, 4000); // Poll every 4 seconds
        }, 1200);
      }, 600);
    }, 400);
  }

  onOutput(callback) {
    this.outputCallbacks.push(callback);
  }

  notifyOutput() {
    this.outputCallbacks.forEach(cb => cb(this.buffer));
  }

  reset() {
    this.buffer = 'Welcome to Claude Code!\n\nHuman: ';
    this.state = 'ready';
    this.responseCount = 0;
    this.inputHistory = [];
  }
}

// Mock PromptQueue Store
class MockPromptQueueStore {
  constructor() {
    this.items = [];
    this.isRunning = false;
    this.currentPromptId = null;
  }

  addPrompt(text) {
    const id = `prompt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.items.push({
      id,
      text: text.trim(),
      status: 'pending',
      createdAt: new Date()
    });
    console.log(`  [Store] Added prompt: "${text}" (${id})`);
    return id;
  }

  removePrompt(id) {
    const item = this.items.find(i => i.id === id);
    if (item) {
      this.items = this.items.filter(i => i.id !== id);
      console.log(`  [Store] Removed prompt: "${item.text}"`);
      console.log(`  [Store] Remaining prompts: ${this.items.length}`);
    }
  }

  setPromptStatus(id, status) {
    const item = this.items.find(i => i.id === id);
    if (item) {
      const oldStatus = item.status;
      item.status = status;
      console.log(`  [Store] Prompt "${item.text}" status: ${oldStatus} -> ${status}`);

      if (status === 'active') {
        this.currentPromptId = id;
      } else if (this.currentPromptId === id && status === 'completed') {
        this.currentPromptId = null;
      }
    }
  }

  getNextPending() {
    return this.items.find(item => item.status === 'pending');
  }

  start() {
    this.isRunning = true;
    console.log('  [Store] Queue started');
  }

  stop() {
    this.isRunning = false;
    this.currentPromptId = null;
    console.log('  [Store] Queue stopped');
  }
}

// Simulate the PromptQueue component logic
class PromptQueueSimulator {
  constructor(store, terminal) {
    this.store = store;
    this.terminal = terminal;
    this.claudeCheckInterval = null;
  }

  // Simulate the actual isClaudeReady function
  isClaudeReady(buffer) {
    const fullText = buffer.toLowerCase();
    const trimmedEnd = fullText.trimEnd();

    // Most reliable: ends with Human: prompt
    if (trimmedEnd.endsWith('human:') || trimmedEnd.endsWith('h:')) {
      return true;
    }

    // Check for Human: in last part AND we're at the end
    const lastFifty = fullText.slice(-50);
    if (lastFifty.includes('human:') &&
        (fullText.endsWith(' ') || fullText.endsWith(':') || fullText.endsWith('\n'))) {
      return true;
    }

    return false;
  }

  // Simulate processNextPromptDirect
  async processNextPromptDirect() {
    console.log('[PromptQueue] Direct processing (no ready check)...');

    const nextPrompt = this.store.getNextPending();
    if (!nextPrompt) {
      console.log('[PromptQueue] No pending prompts');
      this.store.stop();
      return;
    }

    // Mark as active and send
    console.log('[PromptQueue] Sending first prompt immediately:', nextPrompt.text);
    this.store.setPromptStatus(nextPrompt.id, 'active');

    // Send the prompt
    this.terminal.sendInput(nextPrompt.text);
    setTimeout(() => {
      this.terminal.sendInput('\r');
    }, 100);

    // Start completion monitoring immediately (will poll every 4 seconds)
    console.log('[PromptQueue] Starting completion monitoring for prompt:', nextPrompt.id);
    this.checkPromptCompletion(nextPrompt.id);
  }

  // Simulate checkPromptCompletion
  checkPromptCompletion(promptId) {
    console.log('[PromptQueue] checkPromptCompletion called for:', promptId);

    let lastTerminalContent = '';
    let contentStableCount = 0;

    // Poll every 4 seconds like the real code
    const checkInterval = setInterval(() => {
      console.log('[PromptQueue] Polling for completion (every 4 seconds)...');
      // Check if still running
      if (!this.store.isRunning) {
        console.log('[PromptQueue] Queue stopped, ending completion check');
        clearInterval(checkInterval);
        return;
      }

      const currentContent = this.terminal.getBufferContent();
      const prompt = this.store.items.find(i => i.id === promptId);

      // Check for content stability
      if (currentContent === lastTerminalContent) {
        contentStableCount++;
        console.log('[PromptQueue] Buffer stable, count:', contentStableCount);
      } else {
        contentStableCount = 0;
      }
      lastTerminalContent = currentContent;

      // Check if Claude is ready and content is stable
      const isReady = this.isClaudeReady(currentContent);

      if (isReady && contentStableCount > 2) {
        console.log('[PromptQueue] Prompt completed - Claude is ready and buffer stable');
        clearInterval(checkInterval);

        if (prompt && prompt.status === 'active') {
          this.store.setPromptStatus(promptId, 'completed');

          // Auto-remove after delay
          setTimeout(() => {
            console.log('[PromptQueue] Auto-removing completed prompt:', promptId);
            this.store.removePrompt(promptId);

            // Check for more prompts
            const nextPrompt = this.store.getNextPending();
            if (nextPrompt) {
              console.log('[PromptQueue] More prompts pending, continuing...');
              setTimeout(() => {
                this.processNext();
              }, 1000);
            } else {
              console.log('[PromptQueue] No more prompts, stopping queue');
              this.store.stop();
            }
          }, 300);
        }
      }
    }, 4000); // Poll every 4 seconds

    // Timeout after 30 seconds
    setTimeout(() => {
      console.log('[PromptQueue] Completion check timeout');
      clearInterval(checkInterval);

      const prompt = this.store.items.find(i => i.id === promptId);
      if (prompt && prompt.status === 'active') {
        this.store.setPromptStatus(promptId, 'completed');
        setTimeout(() => {
          this.store.removePrompt(promptId);
          this.processNext();
        }, 300);
      }
    }, 30000);
  }

  // Process next prompt (after first one)
  async processNext() {
    const nextPrompt = this.store.getNextPending();
    if (!nextPrompt) {
      console.log('[PromptQueue] No more pending prompts');
      this.store.stop();
      return;
    }

    console.log('[PromptQueue] Processing next prompt:', nextPrompt.text);
    this.store.setPromptStatus(nextPrompt.id, 'active');

    // Send the prompt
    this.terminal.sendInput(nextPrompt.text);
    setTimeout(() => {
      this.terminal.sendInput('\r');

      // Start monitoring for completion
      setTimeout(() => {
        this.checkPromptCompletion(nextPrompt.id);
      }, 2000);
    }, 100);
  }

  // Start the queue
  async start() {
    this.store.start();
    console.log('[PromptQueue] Starting queue processing');
    await this.processNextPromptDirect();
  }
}

// Test runner
async function runTest() {
  console.log('\n=== Automated PromptQueue Test ===\n');

  // Setup
  const terminal = new MockClaudeTerminal();
  const store = new MockPromptQueueStore();
  const queue = new PromptQueueSimulator(store, terminal);

  // Add test prompts
  const prompts = [
    'What is 2 + 2?',
    'List three colors',
    'What is the capital of France?',
    'Calculate 10 * 5'
  ];

  console.log('Adding prompts to queue:');
  prompts.forEach(p => store.addPrompt(p));
  console.log(`Total prompts: ${store.items.length}\n`);

  // Track progress
  let lastOutputTime = Date.now();
  terminal.onOutput(() => {
    lastOutputTime = Date.now();
  });

  // Start processing
  await queue.start();

  // Wait for completion
  await new Promise(resolve => {
    const checkComplete = setInterval(() => {
      const timeSinceLastOutput = Date.now() - lastOutputTime;

      // Check if queue is done
      if (!store.isRunning && store.items.length === 0) {
        clearInterval(checkComplete);
        console.log('\n✅ All prompts processed successfully!');
        resolve();
      }
      // Timeout after 60 seconds of no activity
      else if (timeSinceLastOutput > 60000) {
        clearInterval(checkComplete);
        console.log('\n⚠️ Test timeout - no activity for 60 seconds');
        console.log(`Remaining prompts: ${store.items.length}`);
        resolve();
      }
    }, 1000);
  });

  // Summary
  console.log('\n=== Test Summary ===');
  console.log(`Terminal responses: ${terminal.responseCount}`);
  console.log(`Remaining prompts: ${store.items.length}`);
  console.log(`Final terminal state: ${terminal.state}`);

  if (store.items.length === 0 && terminal.responseCount === prompts.length) {
    console.log('\n✅ TEST PASSED: All prompts were processed and removed');
    return true;
  } else {
    console.log('\n❌ TEST FAILED: Not all prompts were processed');
    return false;
  }
}

// Run the test
console.log('🧪 Starting automated PromptQueue test...');
runTest()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Test error:', error);
    process.exit(1);
  });