// Test All Buffer Reading Methods
// This will find the correct way to read terminal content that updates

console.log('=== TESTING ALL BUFFER READING METHODS ===');
console.log('Time:', new Date().toISOString());

let testResults = {};

// Method 1: Read from terminal.buffer.active
function method1_bufferActive() {
  const terminals = Object.values(window.morphboxTerminals || {});
  for (const term of terminals) {
    if (term.terminal && term.terminal.buffer && term.terminal.buffer.active) {
      const buffer = term.terminal.buffer.active;
      let content = '';
      for (let i = 0; i < buffer.length; i++) {
        const line = buffer.getLine(i);
        if (line) {
          content += line.translateToString(true);
        }
      }
      return content;
    }
  }
  return null;
}

// Method 2: Read from terminal.buffer.normal
function method2_bufferNormal() {
  const terminals = Object.values(window.morphboxTerminals || {});
  for (const term of terminals) {
    if (term.terminal && term.terminal.buffer && term.terminal.buffer.normal) {
      const buffer = term.terminal.buffer.normal;
      let content = '';
      for (let i = 0; i < buffer.length; i++) {
        const line = buffer.getLine(i);
        if (line) {
          content += line.translateToString(true);
        }
      }
      return content;
    }
  }
  return null;
}

// Method 3: Use getBufferContent if it exists
function method3_getBufferContent() {
  const terminals = Object.values(window.morphboxTerminals || {});
  for (const term of terminals) {
    if (term.getBufferContent) {
      return term.getBufferContent();
    }
  }
  return null;
}

// Method 4: Read from DOM xterm-screen
function method4_domScreen() {
  const screen = document.querySelector('.xterm-screen');
  return screen ? screen.textContent : null;
}

// Method 5: Read from xterm rows in DOM
function method5_domRows() {
  const rows = document.querySelectorAll('.xterm-rows > div');
  let content = '';
  rows.forEach(row => {
    content += row.textContent + '\n';
  });
  return content || null;
}

// Method 6: Use terminal.select and read selection
function method6_selection() {
  const terminals = Object.values(window.morphboxTerminals || {});
  for (const term of terminals) {
    if (term.terminal && term.terminal.select) {
      try {
        // Select all
        term.terminal.selectAll();
        const selection = term.terminal.getSelection();
        term.terminal.clearSelection();
        return selection;
      } catch (e) {
        console.error('Selection method failed:', e);
      }
    }
  }
  return null;
}

// Method 7: Read viewport + scrollback
function method7_viewportScrollback() {
  const terminals = Object.values(window.morphboxTerminals || {});
  for (const term of terminals) {
    if (term.terminal && term.terminal.buffer) {
      const buffer = term.terminal.buffer.active;
      const viewport = term.terminal.buffer.viewportY;
      const scrollback = term.terminal.buffer.baseY;
      let content = '';

      // Read from scrollback start to current position
      const totalLines = scrollback + term.terminal.rows;
      for (let i = 0; i <= totalLines; i++) {
        const line = buffer.getLine(i);
        if (line) {
          content += line.translateToString(true) + '\n';
        }
      }
      return content;
    }
  }
  return null;
}

// Method 8: Use terminal write stream interceptor
function method8_writeInterceptor() {
  const terminals = Object.values(window.morphboxTerminals || {});
  for (const term of terminals) {
    if (term.terminal) {
      // Store original write
      if (!term.terminal._originalWrite) {
        term.terminal._originalWrite = term.terminal.write;
        term.terminal._capturedContent = '';

        // Override write to capture content
        term.terminal.write = function(data) {
          term.terminal._capturedContent += data;
          return term.terminal._originalWrite.call(this, data);
        };
      }
      return term.terminal._capturedContent || '';
    }
  }
  return null;
}

// Run all methods and compare
function testAllMethods() {
  console.log('\n=== Testing All Methods ===\n');

  const methods = {
    'buffer.active': method1_bufferActive,
    'buffer.normal': method2_bufferNormal,
    'getBufferContent': method3_getBufferContent,
    'DOM screen': method4_domScreen,
    'DOM rows': method5_domRows,
    'Selection API': method6_selection,
    'Viewport+Scrollback': method7_viewportScrollback,
    'Write Interceptor': method8_writeInterceptor
  };

  for (const [name, method] of Object.entries(methods)) {
    try {
      const content = method();
      testResults[name] = {
        works: content !== null,
        length: content ? content.length : 0,
        last50: content ? content.slice(-50) : '',
        hasPrompt: content ? (content.includes('Human:') || content.includes('>')) : false
      };

      console.log(`${name}:`, {
        works: testResults[name].works,
        length: testResults[name].length,
        hasPrompt: testResults[name].hasPrompt
      });
    } catch (e) {
      testResults[name] = { works: false, error: e.message };
      console.error(`${name}: ERROR -`, e.message);
    }
  }

  // Find best method
  const workingMethods = Object.entries(testResults)
    .filter(([name, result]) => result.works && result.length > 0)
    .sort((a, b) => b[1].length - a[1].length);

  if (workingMethods.length > 0) {
    console.log('\n✓ Best method:', workingMethods[0][0],
                'with', workingMethods[0][1].length, 'chars');
  } else {
    console.log('\n✗ No working methods found!');
  }

  return testResults;
}

// Monitor for changes
function monitorChanges() {
  console.log('\n=== Monitoring for Changes (10 seconds) ===\n');

  const initialResults = {};

  // Get initial state
  const methods = {
    'buffer.active': method1_bufferActive,
    'getBufferContent': method3_getBufferContent,
    'DOM screen': method4_domScreen,
    'Viewport+Scrollback': method7_viewportScrollback
  };

  for (const [name, method] of Object.entries(methods)) {
    const content = method();
    initialResults[name] = content ? content.length : 0;
  }

  console.log('Initial lengths:', initialResults);
  console.log('\nType something in the Claude terminal...\n');

  // Check every 2 seconds
  let checkCount = 0;
  const interval = setInterval(() => {
    checkCount++;
    console.log(`Check #${checkCount}:`);

    for (const [name, method] of Object.entries(methods)) {
      const content = method();
      const currentLength = content ? content.length : 0;
      const diff = currentLength - initialResults[name];

      if (diff !== 0) {
        console.log(`  ${name}: ${diff > 0 ? '+' : ''}${diff} chars (${currentLength} total)`);
        if (diff > 0) {
          console.log(`    New content: "${content.slice(-50)}"`);
        }
      }
    }

    if (checkCount >= 5) {
      clearInterval(interval);
      console.log('\n=== Monitoring Complete ===');
    }
  }, 2000);
}

// Run tests
testAllMethods();

// Make functions available globally
window.testBufferMethods = testAllMethods;
window.monitorBufferChanges = monitorChanges;

console.log('\n=== Instructions ===');
console.log('1. Type something in Claude terminal');
console.log('2. Run: monitorBufferChanges()');
console.log('3. Type more in Claude terminal');
console.log('4. Watch which methods detect changes');

// Start monitoring automatically
setTimeout(() => {
  console.log('\n--- Auto-starting monitor ---');
  monitorChanges();
}, 2000);