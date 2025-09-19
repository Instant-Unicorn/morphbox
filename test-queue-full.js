#!/usr/bin/env node

/**
 * Test prompt queue with multiple prompts
 */

class TestTerminal {
  constructor() {
    this.buffer = 'Welcome to Claude Code!\n\nHuman: ';
    this.state = 'ready';
    this.responseCount = 0;
  }

  getBufferContent() {
    return this.buffer;
  }

  sendInput(text) {
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

    // Simulate Claude Code response
    setTimeout(() => {
      this.buffer += `\n\nAssistant: Processing prompt ${promptNum}...`;

      // Simulate typing response
      setTimeout(() => {
        this.buffer += `\nI've completed task ${promptNum}.`;

        // Response complete, show Human: prompt
        setTimeout(() => {
          this.buffer += `\n\nHuman: `;
          this.state = 'ready';
          console.log(`  ✓ Prompt ${promptNum} completed`);
        }, 500);
      }, 800);
    }, 300);
  }
}

// Mock prompt queue store
class PromptQueueStore {
  constructor() {
    this.items = [];
    this.isRunning = false;
  }

  addPrompt(text) {
    const id = `prompt-${Date.now()}-${Math.random()}`;
    this.items.push({ id, text, status: 'pending' });
    return id;
  }

  getNextPending() {
    return this.items.find(item => item.status === 'pending');
  }

  setPromptStatus(id, status) {
    const item = this.items.find(i => i.id === id);
    if (item) {
      item.status = status;
      console.log(`  [Store] Prompt ${id.substring(0, 20)}... status -> ${status}`);
    }
  }

  removePrompt(id) {
    const index = this.items.findIndex(i => i.id === id);
    if (index !== -1) {
      const removed = this.items.splice(index, 1)[0];
      console.log(`  [Store] Removed prompt: "${removed.text}"`);
      console.log(`  [Store] Remaining prompts: ${this.items.length}`);
    }
  }

  start() {
    this.isRunning = true;
  }

  stop() {
    this.isRunning = false;
    console.log('  [Store] Queue stopped');
  }
}

// Test the queue processing
async function testQueueProcessing() {
  console.log('=== Testing Complete Queue Processing ===\n');

  const terminal = new TestTerminal();
  const store = new PromptQueueStore();

  // Add multiple prompts
  const prompts = [
    'First task: Check the weather',
    'Second task: Write a function',
    'Third task: Run tests',
    'Fourth task: Deploy to production'
  ];

  console.log('Adding prompts to queue:');
  prompts.forEach(prompt => {
    const id = store.addPrompt(prompt);
    console.log(`  Added: "${prompt}"`);
  });

  console.log(`\nTotal prompts in queue: ${store.items.length}\n`);

  // Start the queue
  store.start();
  console.log('Queue started\n');

  // Simulate the queue processing logic
  let lastBufferLength = 0;
  let stableCount = 0;

  async function checkAndProcess() {
    if (!store.isRunning) {
      console.log('\nQueue stopped, ending simulation');
      return;
    }

    const buffer = terminal.getBufferContent();
    const isReady = checkIsReady(buffer);

    if (isReady) {
      const nextPrompt = store.getNextPending();
      if (nextPrompt) {
        console.log(`\n[Processing] Sending prompt: "${nextPrompt.text}"`);
        store.setPromptStatus(nextPrompt.id, 'active');

        // Send prompt
        terminal.sendInput(nextPrompt.text);
        terminal.sendInput('\r');

        // Wait for completion
        setTimeout(() => {
          checkCompletion(nextPrompt.id);
        }, 1500);
      } else {
        console.log('\nNo more pending prompts');
        store.stop();

        // Final cleanup
        const completed = store.items.filter(i => i.status === 'completed');
        console.log(`\nRemoving ${completed.length} completed prompts...`);
        completed.forEach(item => {
          store.removePrompt(item.id);
        });

        console.log(`\nFinal queue state: ${store.items.length} items remaining`);
      }
    } else {
      setTimeout(checkAndProcess, 500);
    }
  }

  function checkCompletion(promptId) {
    const checkInterval = setInterval(() => {
      const buffer = terminal.getBufferContent();
      const bufferLength = buffer.length;

      // Check for stability
      if (bufferLength === lastBufferLength) {
        stableCount++;
      } else {
        stableCount = 0;
      }
      lastBufferLength = bufferLength;

      // If stable and ready, mark as completed
      if (stableCount > 2 && checkIsReady(buffer)) {
        clearInterval(checkInterval);
        store.setPromptStatus(promptId, 'completed');

        // Auto-remove completed prompt
        setTimeout(() => {
          store.removePrompt(promptId);

          // Continue to next
          const hasPending = store.items.some(i => i.status === 'pending');
          if (hasPending) {
            console.log('  Continuing to next prompt...');
            setTimeout(checkAndProcess, 1000);
          } else {
            console.log('\n✓ All prompts processed!');
            store.stop();
          }
        }, 300);
      }
    }, 500);

    // Timeout after 10 seconds
    setTimeout(() => {
      clearInterval(checkInterval);
      console.log('  [Timeout] Marking as completed');
      store.setPromptStatus(promptId, 'completed');
      setTimeout(() => {
        store.removePrompt(promptId);
        checkAndProcess();
      }, 300);
    }, 10000);
  }

  // Helper function
  function checkIsReady(buffer) {
    const trimmed = buffer.toLowerCase().trim();
    return trimmed.endsWith('human:') || trimmed.endsWith('h:');
  }

  // Start processing
  checkAndProcess();
}

// Run the test
testQueueProcessing().catch(console.error);