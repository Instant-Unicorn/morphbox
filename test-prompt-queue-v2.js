#!/usr/bin/env node

/**
 * More accurate test of the actual prompt queue implementation
 */

const fs = require('fs');
const path = require('path');

// Read the actual PromptQueue.svelte file
const promptQueueFile = fs.readFileSync(
  path.join(__dirname, 'web/src/lib/panels/PromptQueue/PromptQueue.svelte'),
  'utf-8'
);

// Extract the key functions
const isClaudeReadyMatch = promptQueueFile.match(/function isClaudeReady\(\)[^{]*{([^}]+(?:{[^}]*}[^}]*)*)}[\s\S]*?^  }/m);
const checkPromptCompletionMatch = promptQueueFile.match(/function checkPromptCompletion\(promptId[^{]*{([^}]+(?:{[^}]*}[^}]*)*)}[\s\S]*?}, \d+\); \/\/ \d+ minutes timeout/m);

console.log('=== Analyzing Current Implementation ===\n');

// Mock environment
class TestEnvironment {
  constructor() {
    this.terminal = {
      buffer: '',
      state: 'ready',
      responseCount: 0
    };

    this.store = {
      items: [],
      isRunning: false
    };

    this.panels = [
      { id: 'test-panel', type: 'claude' }
    ];

    // Track what happens
    this.log = [];
  }

  // Simulate terminal
  getBufferContent() {
    return this.terminal.buffer;
  }

  sendInput(text) {
    this.log.push(`Input: ${text.replace('\r', 'ENTER')}`);

    if (text === '\r' && this.terminal.state === 'ready') {
      // Start processing
      this.terminal.state = 'processing';
      this.terminal.buffer += '\nProcessing...\n';

      // Simulate response after delay
      setTimeout(() => {
        this.terminal.responseCount++;
        this.terminal.buffer += `Response ${this.terminal.responseCount} complete.\n`;
        this.terminal.state = 'ready';
        // Add prompt indicator
        this.terminal.buffer += '│ > Try "help"\n';
        this.log.push(`Terminal ready after response ${this.terminal.responseCount}`);
      }, 200);
    } else if (text !== '\r') {
      this.terminal.buffer += text;
    }
  }

  // Test ready detection with actual patterns
  testIsClaudeReady() {
    const patterns = [
      { buffer: 'welcome to claude\n│ > try "help"', expected: true, name: 'Try with quote' },
      { buffer: 'some output\n⏵⏵', expected: true, name: 'Arrow indicators' },
      { buffer: 'response\nhuman:', expected: true, name: 'Human prompt' },
      { buffer: 'output\n│ > ', expected: true, name: 'Prompt box' },
      { buffer: 'processing...', expected: false, name: 'Mid-processing' },
      { buffer: 'welcome to claude', expected: false, name: 'Welcome without prompt' },
      { buffer: 'text ending>', expected: true, name: 'Ends with >' },
      { buffer: 'text█', expected: true, name: 'Active cursor' }
    ];

    console.log('Testing isClaudeReady patterns:');
    patterns.forEach(p => {
      this.terminal.buffer = p.buffer;
      const ready = this.checkReadyState();
      const pass = ready === p.expected ? '✓' : '✗';
      console.log(`  ${pass} ${p.name}: ${ready} (expected ${p.expected})`);
    });
  }

  checkReadyState() {
    const fullText = this.terminal.buffer.toLowerCase();
    const lastLines = fullText.slice(-200);

    // Check all the patterns from our implementation
    const hasActiveCursor = fullText.endsWith('█') || fullText.endsWith('▊');
    const hasTryQuote = lastLines.includes('try "') || lastLines.includes('try \'');
    const hasBypass = lastLines.includes('bypass permissions');
    const hasArrows = lastLines.includes('⏵⏵') || lastLines.includes('>>');
    const hasHuman = lastLines.includes('human:') || lastLines.includes('h:');
    const hasPromptBox = (lastLines.includes('│') && lastLines.includes('>')) ||
                         (lastLines.includes('┃') && lastLines.includes('>'));
    const endsWithPrompt = fullText.trimEnd().endsWith('>') ||
                          fullText.trimEnd().endsWith(':');

    return hasActiveCursor || hasTryQuote || hasBypass || hasArrows ||
           hasHuman || hasPromptBox || endsWithPrompt;
  }

  // Test completion detection
  testCompletionDetection() {
    console.log('\nTesting completion detection:');

    const scenarios = [
      {
        name: 'Prompt reappeared',
        initial: 'processing...',
        final: 'response done\n│ > try "help"',
        stable: true,
        expected: true
      },
      {
        name: 'Still processing',
        initial: 'processing...',
        final: 'still processing...',
        stable: false,
        expected: false
      },
      {
        name: 'Human prompt shown',
        initial: 'working',
        final: 'done\nhuman:',
        stable: true,
        expected: true
      },
      {
        name: 'Active cursor',
        initial: 'text',
        final: 'response█',
        stable: true,
        expected: true
      }
    ];

    scenarios.forEach(s => {
      const completed = this.checkCompletion(s.initial, s.final, s.stable);
      const pass = completed === s.expected ? '✓' : '✗';
      console.log(`  ${pass} ${s.name}: ${completed} (expected ${s.expected})`);
    });
  }

  checkCompletion(initial, final, isStable) {
    const lowerContent = final.toLowerCase();
    const lastLines = lowerContent.slice(-500);

    let hasPromptBox = false;
    if (lastLines.includes('│ > try') ||
        lastLines.includes('try "') ||
        lastLines.includes('⏵⏵') ||
        lastLines.includes('human:') ||
        lastLines.includes('bypass permissions')) {
      hasPromptBox = true;
    }

    const hasActiveCursor = final.endsWith('█') || final.endsWith('▊');
    const contentGrew = final.length > initial.length + 100;

    return hasPromptBox || hasActiveCursor || (contentGrew && isStable && hasPromptBox);
  }

  // Simulate full queue processing
  async simulateQueue() {
    console.log('\n=== Simulating Queue Processing ===\n');

    // Add prompts
    this.store.items = [
      { id: 'p1', text: 'First prompt', status: 'pending' },
      { id: 'p2', text: 'Second prompt', status: 'pending' },
      { id: 'p3', text: 'Third prompt', status: 'pending' }
    ];
    this.store.isRunning = true;

    // Set terminal ready
    this.terminal.buffer = 'Welcome\n│ > try "help"\n';
    this.terminal.state = 'ready';

    for (let i = 0; i < this.store.items.length; i++) {
      const prompt = this.store.items[i];

      console.log(`Processing prompt ${i+1}: "${prompt.text}"`);

      // Check ready
      if (!this.checkReadyState()) {
        console.log('  ERROR: Claude not ready!');
        break;
      }

      // Mark active
      prompt.status = 'active';
      console.log('  Status: active');

      // Send prompt
      this.sendInput(prompt.text);
      this.sendInput('\r');

      // Wait for completion
      await new Promise(resolve => {
        let checks = 0;
        const checkInterval = setInterval(() => {
          checks++;

          const completed = this.checkReadyState() && this.terminal.state === 'ready';

          if (completed || checks > 10) {
            clearInterval(checkInterval);

            if (completed) {
              prompt.status = 'completed';
              console.log(`  Status: completed (${checks} checks)`);

              // Remove prompt
              this.store.items = this.store.items.filter(p => p.id !== prompt.id);
              i--; // Adjust index since we removed an item
            } else {
              console.log(`  ERROR: Timeout after ${checks} checks`);
            }

            resolve();
          }
        }, 100);
      });

      // Small delay between prompts
      await new Promise(r => setTimeout(r, 300));
    }

    this.store.isRunning = false;
    console.log('\nQueue complete!');
    console.log(`Responses processed: ${this.terminal.responseCount}`);
    console.log(`Remaining items: ${this.store.items.length}`);
  }
}

// Run tests
async function main() {
  const env = new TestEnvironment();

  env.testIsClaudeReady();
  env.testCompletionDetection();
  await env.simulateQueue();

  console.log('\n=== Test Log ===');
  env.log.forEach(l => console.log(`  ${l}`));
}

main().catch(console.error);