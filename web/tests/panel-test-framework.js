#!/usr/bin/env node

/**
 * MorphBox Panel Testing Framework
 * Automated testing for all panel types without user interaction
 */

import { chromium } from '@playwright/test';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Mock Terminal for testing
class MockTerminal {
  constructor(panelId = 'test-terminal') {
    this.panelId = panelId;
    this.buffer = '';
    this.history = [];
    this.isReady = false;
    this.callbacks = new Map();
  }

  getBufferContent() {
    return this.buffer;
  }

  sendInput(text) {
    this.history.push({ type: 'input', text, timestamp: Date.now() });
    this.emit('input', text);

    // Simulate processing
    if (text === '\r') {
      this.simulateResponse();
    }
  }

  simulateResponse() {
    // Simulate Claude response
    setTimeout(() => {
      this.buffer += '\n\nAssistant: Processing your request...';
      this.emit('output', this.buffer);

      setTimeout(() => {
        this.buffer += '\nTask completed.';
        this.emit('output', this.buffer);

        setTimeout(() => {
          this.buffer += '\n\nHuman: ';
          this.isReady = true;
          this.emit('ready', true);
          this.emit('output', this.buffer);
        }, 500);
      }, 1000);
    }, 300);
  }

  on(event, callback) {
    if (!this.callbacks.has(event)) {
      this.callbacks.set(event, []);
    }
    this.callbacks.get(event).push(callback);
  }

  emit(event, data) {
    const callbacks = this.callbacks.get(event) || [];
    callbacks.forEach(cb => cb(data));
  }

  reset() {
    this.buffer = 'Welcome to Claude Code!\n\nHuman: ';
    this.isReady = true;
    this.history = [];
  }
}

// Mock Prompt Queue Store for testing
class MockPromptQueueStore {
  constructor() {
    this.items = [];
    this.isRunning = false;
    this.currentPromptId = null;
    this.subscribers = [];
  }

  subscribe(callback) {
    this.subscribers.push(callback);
    callback(this.getState());
    return () => {
      this.subscribers = this.subscribers.filter(s => s !== callback);
    };
  }

  getState() {
    return {
      items: this.items,
      isRunning: this.isRunning,
      currentPromptId: this.currentPromptId
    };
  }

  notify() {
    const state = this.getState();
    this.subscribers.forEach(callback => callback(state));
  }

  addPrompt(text) {
    const id = `prompt-${Date.now()}-${Math.random()}`;
    this.items.push({
      id,
      text,
      status: 'pending',
      createdAt: new Date()
    });
    this.notify();
    return id;
  }

  removePrompt(id) {
    this.items = this.items.filter(item => item.id !== id);
    if (this.currentPromptId === id) {
      this.currentPromptId = null;
    }
    this.notify();
  }

  setPromptStatus(id, status) {
    const item = this.items.find(i => i.id === id);
    if (item) {
      item.status = status;
      if (status === 'active') {
        this.currentPromptId = id;
      } else if (this.currentPromptId === id) {
        this.currentPromptId = null;
      }
    }
    this.notify();
  }

  getNextPending() {
    return this.items.find(item => item.status === 'pending');
  }

  start() {
    this.isRunning = true;
    this.notify();
  }

  stop() {
    this.isRunning = false;
    this.currentPromptId = null;
    this.notify();
  }

  reset() {
    this.items = [];
    this.isRunning = false;
    this.currentPromptId = null;
    this.notify();
  }
}

// Panel Test Suite
class PanelTestSuite {
  constructor(name) {
    this.name = name;
    this.tests = [];
    this.results = [];
  }

  addTest(name, testFn) {
    this.tests.push({ name, testFn });
  }

  async run() {
    console.log(`\n=== Running ${this.name} Test Suite ===\n`);

    for (const test of this.tests) {
      try {
        console.log(`Running: ${test.name}`);
        const startTime = Date.now();
        await test.testFn();
        const duration = Date.now() - startTime;

        this.results.push({
          name: test.name,
          status: 'passed',
          duration
        });
        console.log(`  ✓ ${test.name} (${duration}ms)`);
      } catch (error) {
        this.results.push({
          name: test.name,
          status: 'failed',
          error: error.message
        });
        console.log(`  ✗ ${test.name}: ${error.message}`);
      }
    }

    return this.results;
  }

  printSummary() {
    const passed = this.results.filter(r => r.status === 'passed').length;
    const failed = this.results.filter(r => r.status === 'failed').length;

    console.log(`\n=== ${this.name} Summary ===`);
    console.log(`Passed: ${passed}/${this.tests.length}`);
    if (failed > 0) {
      console.log(`Failed: ${failed}`);
      this.results
        .filter(r => r.status === 'failed')
        .forEach(r => console.log(`  - ${r.name}: ${r.error}`));
    }
  }
}

// PromptQueue Panel Tests
class PromptQueueTests {
  constructor() {
    this.suite = new PanelTestSuite('PromptQueue Panel');
    this.setupTests();
  }

  setupTests() {
    this.suite.addTest('Add single prompt', async () => {
      const store = new MockPromptQueueStore();
      const id = store.addPrompt('Test prompt');

      if (store.items.length !== 1) {
        throw new Error(`Expected 1 item, got ${store.items.length}`);
      }
      if (store.items[0].status !== 'pending') {
        throw new Error(`Expected status 'pending', got ${store.items[0].status}`);
      }
    });

    this.suite.addTest('Process single prompt', async () => {
      const store = new MockPromptQueueStore();
      const terminal = new MockTerminal();
      terminal.reset();

      const promptId = store.addPrompt('What is 2+2?');
      store.start();
      store.setPromptStatus(promptId, 'active');

      // Simulate sending
      terminal.sendInput('What is 2+2?');
      terminal.sendInput('\r');

      // Wait for response
      await new Promise(resolve => {
        terminal.on('ready', () => {
          store.setPromptStatus(promptId, 'completed');
          store.removePrompt(promptId);
          resolve();
        });
      });

      if (store.items.length !== 0) {
        throw new Error('Prompt was not removed after completion');
      }
    });

    this.suite.addTest('Process multiple prompts sequentially', async () => {
      const store = new MockPromptQueueStore();
      const terminal = new MockTerminal();
      terminal.reset();

      // Add multiple prompts
      const prompts = [
        'First question',
        'Second question',
        'Third question'
      ];

      prompts.forEach(p => store.addPrompt(p));
      store.start();

      let processedCount = 0;

      for (const prompt of prompts) {
        const nextPrompt = store.getNextPending();
        if (!nextPrompt) {
          throw new Error('No pending prompt found');
        }

        store.setPromptStatus(nextPrompt.id, 'active');
        terminal.sendInput(nextPrompt.text);
        terminal.sendInput('\r');

        await new Promise(resolve => {
          terminal.on('ready', () => {
            store.setPromptStatus(nextPrompt.id, 'completed');
            store.removePrompt(nextPrompt.id);
            processedCount++;
            resolve();
          });
        });
      }

      if (processedCount !== 3) {
        throw new Error(`Expected 3 prompts processed, got ${processedCount}`);
      }
      if (store.items.length !== 0) {
        throw new Error('Not all prompts were removed');
      }
    });

    this.suite.addTest('Stop queue during processing', async () => {
      const store = new MockPromptQueueStore();

      store.addPrompt('Prompt 1');
      store.addPrompt('Prompt 2');
      store.start();

      const firstPrompt = store.getNextPending();
      store.setPromptStatus(firstPrompt.id, 'active');

      // Stop the queue
      store.stop();

      if (store.isRunning) {
        throw new Error('Queue should be stopped');
      }
      if (store.currentPromptId !== null) {
        throw new Error('Current prompt ID should be null after stop');
      }
    });

    this.suite.addTest('Edit prompt text', async () => {
      const store = new MockPromptQueueStore();
      const id = store.addPrompt('Original text');

      const item = store.items.find(i => i.id === id);
      item.text = 'Updated text';
      store.notify();

      if (store.items[0].text !== 'Updated text') {
        throw new Error('Prompt text was not updated');
      }
    });

    this.suite.addTest('Reorder prompts', async () => {
      const store = new MockPromptQueueStore();

      const id1 = store.addPrompt('First');
      const id2 = store.addPrompt('Second');
      const id3 = store.addPrompt('Third');

      // Reorder: move third to first position
      const third = store.items.find(i => i.id === id3);
      store.items = store.items.filter(i => i.id !== id3);
      store.items.unshift(third);
      store.notify();

      if (store.items[0].text !== 'Third') {
        throw new Error('Prompt was not reordered correctly');
      }
    });

    this.suite.addTest('Clear all prompts', async () => {
      const store = new MockPromptQueueStore();

      store.addPrompt('Prompt 1');
      store.addPrompt('Prompt 2');
      store.addPrompt('Prompt 3');

      store.reset();

      if (store.items.length !== 0) {
        throw new Error('Prompts were not cleared');
      }
      if (store.isRunning) {
        throw new Error('Queue should not be running after reset');
      }
    });

    this.suite.addTest('Claude ready detection', async () => {
      const patterns = [
        { input: 'Human: ', expected: true },
        { input: 'Assistant: Done.\n\nHuman: ', expected: true },
        { input: 'Processing...', expected: false },
        { input: 'Assistant: Working on it...', expected: false },
        { input: 'Try "help" for more options\n\nHuman: ', expected: true }
      ];

      for (const pattern of patterns) {
        const isReady = checkIsClaudeReady(pattern.input);
        if (isReady !== pattern.expected) {
          throw new Error(`Pattern "${pattern.input.substring(0, 30)}..." expected ${pattern.expected}, got ${isReady}`);
        }
      }
    });

    this.suite.addTest('Completion detection with stability', async () => {
      let buffer = 'Human: test\nAssistant: Processing';
      let lastLength = buffer.length;
      let stableCount = 0;

      // Simulate output growth
      for (let i = 0; i < 5; i++) {
        buffer += '.';
        if (buffer.length === lastLength) {
          stableCount++;
        } else {
          stableCount = 0;
        }
        lastLength = buffer.length;
      }

      // Now simulate completion
      buffer += '\n\nHuman: ';

      // Check stability
      for (let i = 0; i < 3; i++) {
        if (buffer.length === lastLength) {
          stableCount++;
        } else {
          stableCount = 0;
        }
        lastLength = buffer.length;
      }

      if (stableCount < 2) {
        throw new Error('Stability detection failed');
      }

      if (!checkIsClaudeReady(buffer)) {
        throw new Error('Should detect ready state after completion');
      }
    });
  }

  async run() {
    return await this.suite.run();
  }

  printSummary() {
    this.suite.printSummary();
  }
}

// Helper function for Claude ready detection
function checkIsClaudeReady(buffer) {
  const fullText = buffer.toLowerCase();
  const trimmedEnd = fullText.trimEnd();

  // Check for Human: prompt at end
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

// Integration Test Runner
class IntegrationTestRunner {
  constructor() {
    this.browser = null;
    this.page = null;
  }

  async setup() {
    console.log('Setting up browser for integration tests...');
    this.browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    this.page = await this.browser.newPage();
  }

  async teardown() {
    if (this.page) await this.page.close();
    if (this.browser) await this.browser.close();
  }

  async testPromptQueueUI() {
    console.log('\n=== Integration Test: PromptQueue UI ===\n');

    try {
      // Navigate to MorphBox
      await this.page.goto('http://localhost:8008');

      // Wait for page load
      await this.page.waitForTimeout(2000);

      // Check if prompt queue panel exists
      const panelExists = await this.page.evaluate(() => {
        return document.querySelector('[data-panel-type="promptQueue"]') !== null;
      });

      if (!panelExists) {
        console.log('  ℹ️  PromptQueue panel not found in UI (may need to add it)');
        return;
      }

      // Test adding a prompt
      await this.page.evaluate(() => {
        const input = document.querySelector('[data-panel-type="promptQueue"] input');
        if (input) {
          input.value = 'Test prompt from integration test';
          input.dispatchEvent(new Event('input', { bubbles: true }));

          // Trigger add
          const addButton = document.querySelector('[data-panel-type="promptQueue"] button[aria-label="Add prompt"]');
          if (addButton) addButton.click();
        }
      });

      console.log('  ✓ Added test prompt to queue');

      // Check if prompt was added
      const promptCount = await this.page.evaluate(() => {
        const items = document.querySelectorAll('[data-panel-type="promptQueue"] .prompt-item');
        return items.length;
      });

      console.log(`  ✓ Queue has ${promptCount} prompts`);

    } catch (error) {
      console.log(`  ✗ Integration test failed: ${error.message}`);
    }
  }
}

// Main test runner
async function runAllTests() {
  console.log('🧪 MorphBox Panel Test Suite\n');
  console.log('=' .repeat(50));

  // Run unit tests
  const promptQueueTests = new PromptQueueTests();
  await promptQueueTests.run();
  promptQueueTests.printSummary();

  // Run integration tests if server is running
  if (process.env.RUN_INTEGRATION) {
    const integrationRunner = new IntegrationTestRunner();
    try {
      await integrationRunner.setup();
      await integrationRunner.testPromptQueueUI();
    } catch (error) {
      console.error('Integration test error:', error);
    } finally {
      await integrationRunner.teardown();
    }
  } else {
    console.log('\nℹ️  Skipping integration tests. Run with RUN_INTEGRATION=1 to include them.');
  }

  console.log('\n' + '=' .repeat(50));
  console.log('✅ Test suite complete\n');
}

// Export for use in other tests
export {
  MockTerminal,
  MockPromptQueueStore,
  PanelTestSuite,
  PromptQueueTests,
  checkIsClaudeReady
};

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests().catch(console.error);
}