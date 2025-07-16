// Test script to debug Claude panel visibility
// Run this in the browser console after the page loads

console.log('=== Testing Claude Panel Visibility ===\n');

// Step 1: Check localStorage
console.log('1. Checking localStorage:');
const stored = localStorage.getItem('panel-registry');
if (stored) {
  const parsed = JSON.parse(stored);
  const claudeInStorage = parsed.find(p => p.id === 'claude');
  console.log('  - Claude in localStorage:', claudeInStorage ? 'YES' : 'NO');
  if (claudeInStorage) {
    console.log('  - Claude data:', claudeInStorage);
  }
}

// Step 2: Check if we can manually trigger opening Claude
console.log('\n2. To manually open Claude panel, run:');
console.log(`
  // Find the PanelManager component and trigger the action
  const panelManagerButton = document.querySelector('.manager-button');
  if (panelManagerButton) {
    panelManagerButton.click();
    setTimeout(() => {
      // Find and click the Claude panel open button
      const panels = document.querySelectorAll('.panel-item');
      panels.forEach(panel => {
        if (panel.textContent.includes('Claude')) {
          const openButton = panel.querySelector('.open-button');
          if (openButton) {
            console.log('Found Claude panel, clicking open...');
            openButton.click();
          }
        }
      });
    }, 100);
  }
`);

// Step 3: Clear and refresh instructions
console.log('\n3. If Claude is not showing, try:');
console.log('  a) Clear registry: localStorage.removeItem("panel-registry")');
console.log('  b) Refresh the page');
console.log('  c) Open Panel Manager and look for Claude');

// Step 4: Check current DOM
console.log('\n4. Checking current DOM:');
const panelItems = document.querySelectorAll('.panel-item');
let claudeFound = false;
panelItems.forEach((item, index) => {
  const text = item.textContent;
  if (text.includes('Claude')) {
    console.log(`  - Found Claude at panel item ${index}: "${text.trim()}"`);
    claudeFound = true;
  }
});
if (!claudeFound) {
  console.log('  - Claude NOT found in DOM panel items');
}

console.log('\n=== End of test ===');