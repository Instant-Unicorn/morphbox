#!/usr/bin/env node

/**
 * Test prompt queue with realistic Claude Code terminal output patterns
 */

class RealClaudeTerminal {
  constructor() {
    this.buffer = '';
    this.state = 'ready';
    this.responseCount = 0;
  }

  getBufferContent() {
    // Include full scrollback
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

    // Simulate Claude Code response
    setTimeout(() => {
      this.buffer += `\n\nAssistant: I'll help you with that. `;

      // Simulate typing response
      setTimeout(() => {
        this.buffer += `Here's the solution for prompt ${this.responseCount}...`;

        // Response complete, show Human: prompt
        setTimeout(() => {
          this.buffer += `\n\nHuman: `;
          this.state = 'ready';
        }, 200);
      }, 300);
    }, 100);
  }

  setReady() {
    this.buffer = 'Welcome to Claude Code!\n\nHuman: ';
    this.state = 'ready';
  }
}

// Test different scenarios
async function runTests() {
  console.log('=== Testing Realistic Prompt Queue Scenarios ===\n');

  // Test 1: Human: prompt detection
  console.log('Test 1: Human: prompt detection');
  let terminal = new RealClaudeTerminal();
  terminal.setReady();

  let ready = checkIsReady(terminal.getBufferContent());
  console.log(`  Ready with "Human:": ${ready}`);
  console.assert(ready, 'Should be ready with Human: prompt');

  // Test 2: Processing state
  console.log('\nTest 2: Processing state detection');
  terminal.buffer = 'Human: test\n\nAssistant: Processing...';
  ready = checkIsReady(terminal.getBufferContent());
  console.log(`  Ready while processing: ${ready}`);
  console.log(`  Buffer: "${terminal.buffer}"`);
  console.assert(!ready, 'Should not be ready while processing');

  // Test 3: Complete response with Human: prompt
  console.log('\nTest 3: Complete response detection');
  terminal.buffer = 'Human: test\n\nAssistant: Done with response.\n\nHuman: ';
  ready = checkIsReady(terminal.getBufferContent());
  console.log(`  Ready after response: ${ready}`);
  console.assert(ready, 'Should be ready after response with Human:');

  // Test 4: Multiple prompts in sequence
  console.log('\nTest 4: Processing multiple prompts');
  terminal = new RealClaudeTerminal();
  terminal.setReady();

  const prompts = ['First prompt', 'Second prompt', 'Third prompt'];
  let processedCount = 0;

  for (const prompt of prompts) {
    console.log(`  Sending: "${prompt}"`);

    // Wait for ready
    await waitForReady(terminal);

    // Send prompt
    terminal.sendInput(prompt);
    terminal.sendInput('\r');

    // Wait for completion
    await waitForCompletion(terminal);
    processedCount++;
    console.log(`  ✓ Completed ${processedCount}/${prompts.length}`);
  }

  console.assert(processedCount === 3, 'Should process all 3 prompts');
  console.assert(terminal.responseCount === 3, 'Should have 3 responses');

  // Test 5: Edge cases
  console.log('\nTest 5: Edge cases');

  // Empty buffer
  terminal.buffer = '';
  ready = checkIsReady(terminal.buffer);
  console.log(`  Empty buffer ready: ${ready}`);
  console.assert(!ready, 'Empty buffer should not be ready');

  // Partial Human: prompt
  terminal.buffer = 'Huma';
  ready = checkIsReady(terminal.buffer);
  console.log(`  Partial "Human" ready: ${ready}`);
  console.assert(!ready, 'Partial prompt should not be ready');

  // Case sensitivity
  terminal.buffer = 'HUMAN: ';
  ready = checkIsReady(terminal.buffer.toLowerCase());
  console.log(`  Uppercase HUMAN: ready: ${ready}`);
  console.assert(ready, 'Should handle case insensitive');

  console.log('\n=== All Tests Complete ===');
}

function checkIsReady(buffer) {
  const fullText = buffer.toLowerCase();
  const lastLines = fullText.slice(-300);
  const trimmedEnd = fullText.trimEnd();

  // Most reliable: ends with Human: prompt
  if (trimmedEnd.endsWith('human:') || trimmedEnd.endsWith('h:')) {
    return true;
  }

  // Check for Human: in last part AND we're at the end of output
  const lastFifty = fullText.slice(-50);
  if (lastFifty.includes('human:') &&
      (fullText.endsWith(' ') || fullText.endsWith(':') || fullText.endsWith('\n'))) {
    return true;
  }

  // Check for other prompt indicators
  if (lastLines.includes('try "') || lastLines.includes('try \'') ||
      lastLines.includes('would you like to')) {
    return true;
  }

  // Check ending patterns (but not ellipsis)
  if (!trimmedEnd.endsWith('...') &&
      (trimmedEnd.endsWith('>') || trimmedEnd.endsWith('?') || trimmedEnd.endsWith('$'))) {
    return true;
  }

  return false;
}

async function waitForReady(terminal) {
  return new Promise(resolve => {
    const check = () => {
      if (checkIsReady(terminal.getBufferContent())) {
        resolve();
      } else {
        setTimeout(check, 50);
      }
    };
    check();
  });
}

async function waitForCompletion(terminal) {
  // Wait for processing to start
  await new Promise(r => setTimeout(r, 150));

  // Then wait for ready state
  return waitForReady(terminal);
}

// Run tests
runTests().catch(console.error);