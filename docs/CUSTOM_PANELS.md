# MorphBox Custom Panels Guide

## Overview

MorphBox custom panels are powerful, interactive UI components that can be created using AI and accessed throughout your development environment. Panels are:

- **AI-Generated** - Created by Claude using natural language descriptions
- **Fully Interactive** - Real-time WebSocket access to terminal and Claude Code data
- **Editable** - Morph panels with new prompts to evolve functionality
- **Portable** - Export/import `.morph` files to share with others
- **Sandboxed** - Run in secure iframes with controlled API access

## Quick Start

### Creating a Panel

1. Click the **Panel Manager** button (grid icon) in the top bar
2. Click **"Create Custom Panel"**
3. Enter a name and description:
   - **Name**: "Context Meter"
   - **Description**: "Show Claude Code context usage as a battery meter"
4. Click **"Generate Panel"** - Claude will create it for you!
5. The panel appears in your Panel Manager and can be added to your layout

### Editing a Panel

1. Open a custom panel in your layout
2. Click the **pencil icon** (edit button) in the panel header
3. Enter a morph description: "Add a progress bar below the battery"
4. Click **"Morph Panel"** - Claude updates it!
5. The panel automatically reloads with your changes

## Panel Architecture

### File Format: `.morph` Files

Panels are stored as JSON files at `~/morphbox/panels/*.morph`:

```json
{
  "formatVersion": "1.0",
  "metadata": {
    "id": "context-meter-abc123",
    "name": "Context Meter",
    "description": "Shows context window usage",
    "version": "1.0.2",
    "features": [],
    "tags": []
  },
  "code": "<!-- HTML/CSS/JavaScript code -->",
  "promptHistory": [
    {
      "prompt": "Create a context meter...",
      "timestamp": "2025-09-29T18:05:05.337Z",
      "type": "create",
      "resultingVersion": "1.0.0"
    }
  ],
  "createdAt": "2025-09-29T18:05:05.337Z",
  "updatedAt": "2025-09-29T18:43:44.398Z"
}
```

### Panel Structure

Each panel's `code` field contains vanilla HTML/CSS/JavaScript:

```html
<!--
@morphbox-panel
id: panel-id
name: Panel Name
description: What it does
version: 1.0.0
-->

<div class="custom-panel">
  <div class="panel-header">
    <h2>Panel Name</h2>
  </div>
  <div class="panel-content">
    <!-- Your content -->
  </div>
</div>

<style>
  /* CSS using MorphBox theme variables */
  .custom-panel {
    background: var(--bg-primary, #1a1a1a);
    color: var(--text-primary, #ffffff);
  }
</style>

<script>
  // JavaScript with access to:
  // - panelId: Unique instance ID
  // - data: Panel configuration data
  // - websocketUrl: WebSocket server URL
</script>
```

## Available APIs

### 1. WebSocket Access (NEW!)

Panels have **full access** to MorphBox's WebSocket for real-time data:

```javascript
// Connect to WebSocket
const ws = new WebSocket(websocketUrl);

ws.onopen = () => {
  console.log('Connected to MorphBox WebSocket');
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);

  switch (data.type) {
    case 'OUTPUT':
      // Terminal output from any session
      console.log('Terminal:', data.payload.data);
      break;

    case 'context_update':
      // Claude Code context tracking (NEW!)
      const { used, max } = data.payload.tokens;
      console.log(`Context: ${used}/${max} tokens`);
      break;

    case 'CONNECTED':
      console.log('Session ID:', data.payload.sessionId);
      break;

    case 'AGENT_LAUNCHED':
      console.log('Agent started:', data.payload.agentId);
      break;
  }
};

ws.onerror = (error) => {
  console.error('WebSocket error:', error);
};

ws.onclose = () => {
  console.log('WebSocket closed');
};
```

### 2. Context Tracking

Monitor Claude Code's context window usage in real-time:

```javascript
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);

  if (data.type === 'context_update') {
    const { used, max } = data.payload.tokens;
    const percentage = (used / max) * 100;

    // Update UI
    document.getElementById('used').textContent = used.toLocaleString();
    document.getElementById('max').textContent = max.toLocaleString();
    document.getElementById('percent').textContent = `${percentage.toFixed(1)}%`;
  }
};
```

The WebSocket server automatically parses context data from Claude Code output in these formats:
- `<budget:token_budget>200000</budget:token_budget>`
- `Token usage: 56234/200000; 143766 remaining`
- `85000/200000 remaining`

### 3. MorphBox Theme Variables

Use CSS variables for consistent theming:

```css
:root {
  --bg-primary: #1e1e1e;
  --bg-secondary: #252526;
  --bg-tertiary: #2d2d30;
  --text-primary: #d4d4d4;
  --text-secondary: #858585;
  --border-color: #3e3e42;
  --accent-color: #0e639c;
  --error-color: #f48771;
  --success-color: #89d185;
  --warning-color: #cca700;
  --info-color: #75beff;
}
```

### 4. Panel Variables

These are available in your script:

```javascript
const panelId;        // Unique instance ID (e.g., "panel-123")
const data;           // Panel data object (can store state)
const websocketUrl;   // WebSocket URL (e.g., "ws://localhost:8009")
```

### 5. Lifecycle Management

Use `onMount()` pattern since code is auto-wrapped:

```javascript
// This runs when panel loads
console.log('Panel initialized:', panelId);

// Setup
const ws = new WebSocket(websocketUrl);
let intervalId = setInterval(updateData, 1000);

// Cleanup on panel destroy
window.addEventListener('beforeunload', () => {
  if (ws) ws.close();
  if (intervalId) clearInterval(intervalId);
});
```

## Panel Examples

### 1. Context Meter (Real-time Tracking)

```javascript
<div class="battery-container">
  <div class="battery-level" id="level"></div>
  <div class="battery-text">
    <span id="used">0</span> / <span id="max">0</span>
  </div>
</div>

<style>
  .battery-container {
    position: relative;
    width: 300px;
    height: 60px;
    border: 3px solid var(--border-color);
    border-radius: 8px;
    overflow: hidden;
  }

  .battery-level {
    height: 100%;
    background: linear-gradient(90deg, #22c55e, #16a34a);
    transition: width 0.5s ease;
  }

  .battery-text {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-weight: bold;
    color: white;
    text-shadow: 0 1px 3px rgba(0,0,0,0.5);
  }
</style>

<script>
  const ws = new WebSocket(websocketUrl);
  const level = document.getElementById('level');
  const usedEl = document.getElementById('used');
  const maxEl = document.getElementById('max');

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === 'context_update') {
      const { used, max } = data.payload.tokens;
      const percentage = (used / max) * 100;

      level.style.width = `${percentage}%`;
      usedEl.textContent = used.toLocaleString();
      maxEl.textContent = max.toLocaleString();

      // Change color based on usage
      if (percentage > 75) {
        level.style.background = 'linear-gradient(90deg, #ef4444, #dc2626)';
      } else if (percentage > 50) {
        level.style.background = 'linear-gradient(90deg, #eab308, #ca8a04)';
      }
    }
  };
</script>
```

### 2. Terminal Monitor (Output Filtering)

```javascript
<div class="monitor">
  <input type="text" id="filter" placeholder="Filter output...">
  <div id="output" class="output-area"></div>
</div>

<script>
  const ws = new WebSocket(websocketUrl);
  const filterInput = document.getElementById('filter');
  const outputArea = document.getElementById('output');
  let allOutput = [];

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === 'OUTPUT') {
      allOutput.push(data.payload.data);
      updateDisplay();
    }
  };

  filterInput.addEventListener('input', updateDisplay);

  function updateDisplay() {
    const filter = filterInput.value.toLowerCase();
    const filtered = allOutput.filter(line =>
      line.toLowerCase().includes(filter)
    );
    outputArea.textContent = filtered.join('');
  }
</script>
```

### 3. Activity Dashboard (Statistics)

```javascript
<div class="stats">
  <div class="stat-card">
    <h3>Lines Output</h3>
    <div id="lineCount">0</div>
  </div>
  <div class="stat-card">
    <h3>Errors</h3>
    <div id="errorCount">0</div>
  </div>
  <div class="stat-card">
    <h3>Commands</h3>
    <div id="commandCount">0</div>
  </div>
</div>

<script>
  const ws = new WebSocket(websocketUrl);
  let stats = { lines: 0, errors: 0, commands: 0 };

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);

    if (data.type === 'OUTPUT') {
      stats.lines++;
      if (data.payload.data.includes('error')) stats.errors++;
      if (data.payload.data.includes('$ ')) stats.commands++;

      document.getElementById('lineCount').textContent = stats.lines;
      document.getElementById('errorCount').textContent = stats.errors;
      document.getElementById('commandCount').textContent = stats.commands;
    }
  };
</script>
```

## Customizing the Generation Prompt

You can customize how Claude generates panels by editing the **Custom Panel System Prompt** in Settings:

1. Open **Settings** panel
2. Scroll to **"Custom Panel System Prompt"**
3. Edit the prompt to change how panels are created
4. Save settings

The default prompt emphasizes:
- Vanilla JavaScript (no frameworks)
- MorphBox theme variables
- WebSocket integration
- Error handling and loading states
- Responsive design

You can customize it to add:
- Specific libraries or patterns you prefer
- Additional coding standards
- Custom styling requirements
- Accessibility guidelines

## Best Practices

### 1. WebSocket Connection Management

```javascript
let ws = null;
let reconnectTimeout = null;

function connectWebSocket() {
  if (!websocketUrl) {
    console.error('No WebSocket URL provided');
    return;
  }

  ws = new WebSocket(websocketUrl);

  ws.onopen = () => {
    console.log('Connected');
  };

  ws.onclose = () => {
    console.log('Disconnected, reconnecting...');
    reconnectTimeout = setTimeout(connectWebSocket, 3000);
  };

  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
  };
}

// Cleanup
window.addEventListener('beforeunload', () => {
  if (ws) ws.close();
  if (reconnectTimeout) clearTimeout(reconnectTimeout);
});

connectWebSocket();
```

### 2. Error Handling

Always handle errors gracefully:

```javascript
try {
  const response = await fetch('/api/data');
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = await response.json();
  // Use data
} catch (error) {
  console.error('Failed to fetch data:', error);
  document.getElementById('status').textContent = 'Error loading data';
}
```

### 3. Loading States

Show feedback during async operations:

```javascript
const statusEl = document.getElementById('status');

statusEl.textContent = 'Loading...';
try {
  const data = await fetchData();
  statusEl.textContent = 'Ready';
} catch (error) {
  statusEl.textContent = 'Failed to load';
}
```

### 4. Performance

```javascript
// Debounce frequent updates
let updateTimeout;
function scheduleUpdate() {
  clearTimeout(updateTimeout);
  updateTimeout = setTimeout(updateDisplay, 100);
}

// Limit stored data
const MAX_LINES = 1000;
if (outputLines.length > MAX_LINES) {
  outputLines = outputLines.slice(-MAX_LINES);
}
```

### 5. Theme Integration

```css
/* Always use theme variables */
.panel {
  background: var(--bg-primary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

.button {
  background: var(--accent-color);
  color: white;
}

.button:hover {
  background: var(--accent-hover);
}

.error {
  color: var(--error-color);
}

.success {
  color: var(--success-color);
}
```

## Security Considerations

### Trust Model

- Panels are **AI-generated by your Claude CLI** on the host
- Panel code runs in **iframe sandboxes** with same-origin policy
- WebSocket access is **intentional** - you control the data flow
- Only install panels you trust or have reviewed

### What Panels Can Access

✅ **Allowed:**
- WebSocket connection to MorphBox server
- Terminal output from your sessions
- Context tracking data from Claude Code
- MorphBox API endpoints
- Browser storage (localStorage, etc.)

❌ **Not Allowed:**
- Direct file system access
- Arbitrary network requests (CORS restricted)
- Other browser tabs/windows
- Host system commands

### Best Practices

1. **Review generated code** before using panels in production
2. **Keep panels simple** - complex logic is harder to audit
3. **Don't store secrets** in panel code
4. **Use environment variables** for sensitive configuration
5. **Update regularly** - morph panels to fix issues

## Troubleshooting

### Panel Not Loading

**Symptom**: Panel shows loading spinner forever

**Solutions**:
1. Check browser console for errors (F12)
2. Verify `.morph` file exists: `ls ~/morphbox/panels/`
3. Check panel code syntax in the file
4. Try creating a simple test panel

### WebSocket Not Connecting

**Symptom**: `ws.readyState` stays at `0` (CONNECTING)

**Solutions**:
1. Check if `websocketUrl` is defined: `console.log(websocketUrl)`
2. Verify WebSocket server is running: `ps aux | grep websocket`
3. Check firewall rules for WebSocket port (default 8009)
4. Look for errors in terminal where MorphBox is running

### Context Data Not Showing

**Symptom**: Context meter shows "Waiting for data..."

**Solutions**:
1. Ensure Claude Code is running in a terminal panel
2. Check if context output appears in terminal
3. Look for `[Context Tracking]` logs in MorphBox server
4. Verify WebSocket connection is established

### Panel Edits Not Applying

**Symptom**: Morphed panel shows old code

**Solutions**:
1. Check that the `.morph` file was updated: `ls -la ~/morphbox/panels/`
2. Hard refresh the page (Ctrl+Shift+R or Cmd+Shift+R)
3. Check browser console for cache errors
4. Close and reopen the panel

## Advanced Topics

### Custom API Integration

Create a server endpoint to provide data:

```typescript
// web/src/routes/api/panel-data/+server.ts
export async function GET() {
  const data = await fetchFromExternalAPI();
  return json(data);
}
```

Then fetch it from your panel:

```javascript
const response = await fetch('/api/panel-data');
const data = await response.json();
```

### State Persistence

Save panel state to localStorage:

```javascript
// Save state
function saveState() {
  localStorage.setItem(`panel-${panelId}`, JSON.stringify(state));
}

// Load state
function loadState() {
  const saved = localStorage.getItem(`panel-${panelId}`);
  return saved ? JSON.parse(saved) : defaultState;
}

let state = loadState();
```

### Inter-Panel Communication

Use browser events to communicate between panels:

```javascript
// Panel A: Broadcast event
window.dispatchEvent(new CustomEvent('panel-update', {
  detail: { source: panelId, data: someData }
}));

// Panel B: Listen for event
window.addEventListener('panel-update', (event) => {
  if (event.detail.source !== panelId) {
    console.log('Update from another panel:', event.detail.data);
  }
});
```

## Sharing Panels

### Export a Panel

1. Right-click panel in Panel Manager
2. Select **"Export Panel"**
3. Save the `.morph` file

### Import a Panel

1. Click **"Import Panel"** in Panel Manager
2. Select the `.morph` file
3. Panel appears in your library

### Share with Community

Post your `.morph` files:
- GitHub Gists
- MorphBox Discord
- Community forum

## Resources

- [MorphBox Architecture](./ARCHITECTURE_VM.md) - How MorphBox works
- [WebSocket API Reference](./API_REFERENCE.md) - All message types
- [Svelte Docs](https://svelte.dev) - For understanding the syntax
- [MDN Web APIs](https://developer.mozilla.org/en-US/docs/Web/API) - JavaScript reference

## Contributing

Ideas for improving custom panels:

1. **Share your panels** - Post to GitHub Discussions
2. **Report bugs** - File issues on GitHub
3. **Improve documentation** - Submit PRs
4. **Request features** - Open feature requests
5. **Build tools** - Create panel development utilities

---

**Need help?** Open an issue on GitHub or ask in Discord!