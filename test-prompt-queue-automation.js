// Automated test for MorphBox prompt queue using Playwright
// This test will verify the queue continues after timeout completion

const TEST_URL = 'http://100.96.36.2:8010';

console.log('=== STARTING AUTOMATED PROMPT QUEUE TEST ===');
console.log('Testing with MorphBox at:', TEST_URL);

async function runTest() {
  // Navigate to MorphBox
  console.log('1. Navigating to MorphBox...');
  await mcp.playwright.browser_navigate({
    url: TEST_URL
  });

  // Wait for page to load
  await mcp.playwright.browser_wait_for({ time: 3 });

  // Take initial snapshot
  console.log('2. Taking initial snapshot...');
  const initialSnapshot = await mcp.playwright.browser_snapshot();
  console.log('Initial page loaded, panels available:',
    initialSnapshot.includes('claude') && initialSnapshot.includes('prompt'));

  // Set up Claude panel - click on Claude panel button
  console.log('3. Setting up Claude panel...');

  // Find and click Claude panel button
  const claudeButton = initialSnapshot.match(/button[^>]*>([^<]*Claude[^<]*)</i);
  if (claudeButton) {
    await mcp.playwright.browser_click({
      element: 'Claude panel button',
      ref: 'button containing "Claude"'
    });
    console.log('Clicked Claude button');
  }

  // Wait for Claude terminal to load
  await mcp.playwright.browser_wait_for({ time: 5 });

  // Set up Prompt Queue panel
  console.log('4. Setting up Prompt Queue panel...');

  // Click to add new panel
  await mcp.playwright.browser_click({
    element: 'Add panel button',
    ref: 'button[aria-label="Add new panel"]'
  });

  await mcp.playwright.browser_wait_for({ time: 1 });

  // Select Prompt Queue from panel types
  await mcp.playwright.browser_click({
    element: 'Prompt Queue option',
    ref: 'div containing "Prompt Queue"'
  });

  await mcp.playwright.browser_wait_for({ time: 2 });

  // Take snapshot to verify panels are set up
  const panelsSnapshot = await mcp.playwright.browser_snapshot();
  console.log('5. Panels set up, Claude terminal visible:',
    panelsSnapshot.includes('Human:') || panelsSnapshot.includes('Claude'));

  // Add test prompts to the queue
  console.log('6. Adding test prompts to queue...');

  const prompts = [
    'List 3 colors',
    'What is 5 + 5?',
    'Name one planet'
  ];

  for (const prompt of prompts) {
    // Find the prompt input field
    await mcp.playwright.browser_type({
      element: 'Prompt input field',
      ref: 'textarea[placeholder="Enter a prompt..."]',
      text: prompt,
      submit: false
    });

    // Click Add button
    await mcp.playwright.browser_click({
      element: 'Add prompt button',
      ref: 'button[aria-label="Add prompt"]'
    });

    console.log(`Added prompt: "${prompt}"`);
    await mcp.playwright.browser_wait_for({ time: 0.5 });
  }

  // Start the queue
  console.log('7. Starting queue processing...');
  await mcp.playwright.browser_click({
    element: 'Play button',
    ref: 'button[title="Start processing"]'
  });

  console.log('Queue started, monitoring for completion...');

  // Monitor queue processing
  let completed = 0;
  let lastSnapshot = '';
  let checks = 0;
  const maxChecks = 30; // 2 minutes max

  while (completed < prompts.length && checks < maxChecks) {
    await mcp.playwright.browser_wait_for({ time: 4 });
    checks++;

    // Check console for our debug logs
    const consoleMessages = await mcp.playwright.browser_console_messages();

    // Look for completion indicators in console
    const recentLogs = consoleMessages.slice(-20);
    const hasCompletion = recentLogs.some(log =>
      log.includes('completed') ||
      log.includes('TIMEOUT FALLBACK') ||
      log.includes('marking complete')
    );

    if (hasCompletion) {
      completed++;
      console.log(`✓ Prompt ${completed}/${prompts.length} completed!`);
    }

    // Take snapshot to check queue state
    const snapshot = await mcp.playwright.browser_snapshot();

    // Check if queue items show as completed or removed
    const pendingCount = (snapshot.match(/status-pending/g) || []).length;
    const activeCount = (snapshot.match(/status-active/g) || []).length;
    const completedCount = (snapshot.match(/status-completed/g) || []).length;

    console.log(`Check ${checks}: Pending=${pendingCount}, Active=${activeCount}, Completed=${completedCount}`);

    // Check if Claude received the response
    if (snapshot.includes('Red') || snapshot.includes('blue') || snapshot.includes('green')) {
      console.log('Claude responded to color prompt');
    }
    if (snapshot.includes('10') || snapshot.includes('ten')) {
      console.log('Claude responded to math prompt');
    }
    if (snapshot.includes('Earth') || snapshot.includes('Mars') || snapshot.includes('Jupiter')) {
      console.log('Claude responded to planet prompt');
    }

    // If no pending and no active, we're done
    if (pendingCount === 0 && activeCount === 0) {
      console.log('✓ All prompts processed!');
      completed = prompts.length;
      break;
    }

    lastSnapshot = snapshot;
  }

  // Final results
  console.log('\n=== TEST RESULTS ===');
  if (completed === prompts.length) {
    console.log('✅ SUCCESS: All prompts were processed');
    console.log('The queue correctly continued after timeout completions');
  } else {
    console.log(`❌ FAILED: Only ${completed}/${prompts.length} prompts completed`);
    console.log('The queue did not continue properly');

    // Check console for errors
    const consoleMessages = await mcp.playwright.browser_console_messages();
    const errors = consoleMessages.filter(msg => msg.includes('ERROR') || msg.includes('error'));
    if (errors.length > 0) {
      console.log('Errors found:', errors.slice(-5));
    }
  }

  // Take final screenshot
  await mcp.playwright.browser_take_screenshot({
    filename: 'prompt-queue-test-final.png',
    fullPage: false
  });
  console.log('Screenshot saved as prompt-queue-test-final.png');

  return completed === prompts.length;
}

// Run the test
runTest().then(success => {
  console.log('\n=== TEST COMPLETE ===');
  console.log(success ? '✅ Test passed!' : '❌ Test failed');
}).catch(error => {
  console.error('Test error:', error);
});