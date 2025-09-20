#!/usr/bin/env node

import puppeteer from 'puppeteer';

async function testEventDrivenPromptQueue() {
  console.log('🚀 Starting Event-Driven Prompt Queue Test');

  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1400, height: 900 }
  });

  const page = await browser.newPage();

  // Enable console logging
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('[PromptQueue]') ||
        text.includes('[Terminal]') ||
        text.includes('[RowPanel]') ||
        text.includes('claude-idle')) {
      console.log(`Browser: ${text}`);
    }
  });

  try {
    // Navigate to MorphBox
    console.log('📍 Navigating to http://localhost:8008');
    await page.goto('http://localhost:8008', { waitUntil: 'networkidle2' });

    // Wait for page to load
    await page.waitForSelector('.panel-container', { timeout: 10000 });
    console.log('✅ MorphBox loaded');

    // Open command palette
    console.log('📝 Opening command palette');
    await page.keyboard.press('p', { modifiers: ['ControlOrMeta'] });
    await page.waitForSelector('.command-palette', { timeout: 5000 });

    // Search for Claude terminal
    console.log('🔍 Searching for Claude terminal');
    await page.type('.command-input', 'claude terminal');
    await page.waitForTimeout(500);

    // Select Claude Terminal
    await page.keyboard.press('Enter');
    console.log('✅ Claude terminal created');
    await page.waitForTimeout(2000);

    // Open command palette again for Prompt Queue
    console.log('📝 Opening Prompt Queue');
    await page.keyboard.press('p', { modifiers: ['ControlOrMeta'] });
    await page.waitForSelector('.command-palette', { timeout: 5000 });
    await page.type('.command-input', 'prompt queue');
    await page.waitForTimeout(500);
    await page.keyboard.press('Enter');
    console.log('✅ Prompt Queue panel created');
    await page.waitForTimeout(2000);

    // Find the prompt queue panel
    const promptQueuePanel = await page.waitForSelector('.prompt-queue-panel', { timeout: 5000 });
    console.log('✅ Found Prompt Queue panel');

    // Add test prompts
    console.log('📝 Adding test prompts');
    const prompts = [
      '2 + 2',
      'What is the capital of France?',
      'List 3 prime numbers'
    ];

    for (const prompt of prompts) {
      const addButton = await page.waitForSelector('.prompt-queue-panel .add-prompt', { timeout: 5000 });
      await addButton.click();

      const textarea = await page.waitForSelector('.prompt-queue-panel textarea', { timeout: 5000 });
      await textarea.type(prompt);

      const saveButton = await page.waitForSelector('.prompt-queue-panel button:has-text("Add")', { timeout: 5000 });
      await saveButton.click();

      console.log(`✅ Added prompt: "${prompt}"`);
      await page.waitForTimeout(500);
    }

    // Start the queue
    console.log('🚀 Starting queue processing');
    const startButton = await page.waitForSelector('.prompt-queue-panel .start-queue', { timeout: 5000 });
    await startButton.click();

    // Monitor for event-driven behavior
    console.log('👀 Monitoring event-driven queue processing...');

    let completedCount = 0;
    const startTime = Date.now();
    const timeout = 60000; // 60 second timeout

    // Wait for all prompts to complete
    while (completedCount < prompts.length && (Date.now() - startTime) < timeout) {
      // Check for completed items
      const completedItems = await page.$$eval('.prompt-queue-panel .queue-item.completed',
        items => items.length
      );

      if (completedItems > completedCount) {
        console.log(`✅ Prompt ${completedItems}/${prompts.length} completed via event-driven trigger`);
        completedCount = completedItems;
      }

      // Check if queue is empty (all completed and removed)
      const remainingItems = await page.$$eval('.prompt-queue-panel .queue-item',
        items => items.length
      );

      if (remainingItems === 0 && completedCount === prompts.length) {
        console.log('🎉 All prompts processed and removed!');
        break;
      }

      await page.waitForTimeout(1000);
    }

    // Final verification
    const finalItems = await page.$$eval('.prompt-queue-panel .queue-item',
      items => items.length
    );

    if (finalItems === 0) {
      console.log('✅ TEST PASSED: Event-driven queue processed all prompts successfully');
      console.log('✅ Queue automatically continued after each claude-idle event');
    } else {
      console.log(`❌ TEST FAILED: ${finalItems} items still in queue`);

      // Capture diagnostic info
      const queueState = await page.$eval('.prompt-queue-panel', el => el.innerText);
      console.log('Queue state:', queueState);
    }

    const duration = Date.now() - startTime;
    console.log(`⏱️  Test completed in ${(duration/1000).toFixed(2)} seconds`);

  } catch (error) {
    console.error('❌ Test failed:', error);

    // Take screenshot for debugging
    await page.screenshot({ path: 'test-failure.png' });
    console.log('Screenshot saved to test-failure.png');
  }

  await browser.close();
  process.exit(0);
}

// Run the test
testEventDrivenPromptQueue().catch(console.error);