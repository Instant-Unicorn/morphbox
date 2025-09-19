// Test script to verify prompt queue completion detection

console.log('Testing prompt queue completion detection...\n');

// Simulate terminal content changes
let content = 'Initial terminal content';
let lastContent = '';
let stableCount = 0;
let initialLength = content.length;

function checkCompletion() {
  // Simulate content growth
  if (content.length < 200) {
    content += '\nClaude is responding...';
    console.log('Content growing:', content.length, 'chars');
  }

  // Check if stable
  if (content === lastContent) {
    stableCount++;
    console.log('Content stable for', stableCount, 'checks');
  } else {
    stableCount = 0;
    lastContent = content;
    console.log('Content changed, resetting stable count');
  }

  // Check completion conditions
  const contentGrew = content.length > initialLength + 50;
  const isStable = stableCount >= 2;

  if (contentGrew && isStable) {
    console.log('\n✓ COMPLETION DETECTED!');
    console.log('  - Content grew:', contentGrew);
    console.log('  - Is stable:', isStable);
    console.log('  - Would proceed to next prompt');
    clearInterval(interval);
  }
}

// Run checks every 4 seconds
const interval = setInterval(checkCompletion, 4000);

// Test immediately
checkCompletion();