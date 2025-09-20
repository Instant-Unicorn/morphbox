// Terminal Buffer Diagnostic Test
// This will run in the browser console to diagnose buffer reading issues

console.log('=== Terminal Buffer Diagnostic Test Starting ===');

// Function to get all panels
function getAllPanels() {
  // Try different methods to get panels
  if (window.allPanels) {
    return window.allPanels;
  }
  // Try to find the store in Svelte devtools
  const stores = window.__svelte_stores__;
  if (stores && stores.allPanels) {
    return stores.allPanels;
  }
  return null;
}

// Main diagnostic function
function runDiagnostic() {
  console.log('\n--- Diagnostic Check ---');
  console.log('Time:', new Date().toISOString());

  // Method 1: Try to find Claude panel via window.morphboxTerminals
  console.log('\nMethod 1: Checking window.morphboxTerminals...');
  if (window.morphboxTerminals) {
    const terminalIds = Object.keys(window.morphboxTerminals);
    console.log('Found terminals:', terminalIds);

    terminalIds.forEach(id => {
      const terminal = window.morphboxTerminals[id];
      console.log(`\nTerminal ${id}:`);

      if (terminal.getBufferContent) {
        const content = terminal.getBufferContent();
        console.log('- Buffer length:', content.length);
        console.log('- Last 300 chars:', content.slice(-300));
        console.log('- Contains "Human:"?', content.includes('Human:'));
        console.log('- Contains "Assistant:"?', content.includes('Assistant:'));
        console.log('- Contains "│"?', content.includes('│'));
        console.log('- Contains ">"?', content.includes('>'));

        // Store for comparison
        if (!window.lastBufferContent) {
          window.lastBufferContent = {};
        }
        if (window.lastBufferContent[id] !== content) {
          console.log('✓ BUFFER CHANGED!');
          window.lastBufferContent[id] = content;
        } else {
          console.log('✗ Buffer unchanged');
        }
      } else {
        console.log('- No getBufferContent method');
      }
    });
  } else {
    console.log('✗ window.morphboxTerminals not found');
  }

  // Method 2: Try to access terminal via DOM
  console.log('\nMethod 2: Checking DOM for terminal...');
  const terminalContainers = document.querySelectorAll('.terminal-container');
  console.log('Found terminal containers:', terminalContainers.length);

  terminalContainers.forEach((container, i) => {
    console.log(`\nContainer ${i}:`);

    // Check for xterm instance
    if (container._terminal) {
      const term = container._terminal;
      console.log('- Has _terminal property');

      // Try to read buffer
      if (term.buffer && term.buffer.active) {
        const buffer = term.buffer.active;
        console.log('- Buffer lines:', buffer.length);
        console.log('- Cursor position:', buffer.cursorY);

        // Read last few lines
        const lines = [];
        for (let i = Math.max(0, buffer.length - 10); i < buffer.length; i++) {
          const line = buffer.getLine(i);
          if (line) {
            lines.push(line.translateToString(true));
          }
        }
        console.log('- Last 10 lines:', lines.join('\n'));
      }
    } else {
      console.log('- No _terminal property');
    }

    // Check for xterm Terminal in data
    if (container.terminal) {
      console.log('- Has terminal property');
    }
  });

  // Method 3: Check xterm instances globally
  console.log('\nMethod 3: Looking for xterm instances...');
  if (window.Terminal) {
    console.log('- window.Terminal exists (xterm constructor)');
  }

  // Method 4: Monitor DOM mutations
  console.log('\nMethod 4: Checking if terminal DOM is changing...');
  const xtermScreens = document.querySelectorAll('.xterm-screen');
  xtermScreens.forEach((screen, i) => {
    const text = screen.textContent;
    console.log(`Screen ${i} text length:`, text.length);
    console.log('First 200 chars:', text.substring(0, 200));

    // Store for comparison
    if (!window.lastScreenText) {
      window.lastScreenText = {};
    }
    if (window.lastScreenText[i] !== text) {
      console.log('✓ SCREEN TEXT CHANGED!');
      window.lastScreenText[i] = text;
    } else {
      console.log('✗ Screen text unchanged');
    }
  });
}

// Run diagnostic immediately
runDiagnostic();

// Set up continuous monitoring
console.log('\n=== Starting continuous monitoring (every 2 seconds) ===');
console.log('To stop: clearInterval(window.diagnosticInterval)');

window.diagnosticInterval = setInterval(runDiagnostic, 2000);

// Also monitor for specific events
console.log('\n=== Setting up event monitoring ===');

// Monitor WebSocket messages
const originalSend = WebSocket.prototype.send;
WebSocket.prototype.send = function(data) {
  console.log('[WebSocket] Sending:', data.substring(0, 100));
  return originalSend.call(this, data);
};

// Return instructions
console.log('\n=== INSTRUCTIONS ===');
console.log('1. Open MorphBox at http://100.96.36.2:8008/');
console.log('2. Open browser console (F12)');
console.log('3. Paste this entire script');
console.log('4. Open Claude terminal and type something');
console.log('5. Watch the console for buffer changes');
console.log('6. To stop monitoring: clearInterval(window.diagnosticInterval)');