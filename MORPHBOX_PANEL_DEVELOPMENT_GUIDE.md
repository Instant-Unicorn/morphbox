# MorphBox Panel Development Guide

## Overview
MorphBox panels are modular UI components built with SvelteKit that provide different functionalities within the MorphBox environment. Each panel runs in an isolated Docker container and communicates via WebSocket connections.

## Architecture

### Core Components
- **BasePanel.svelte**: Base component all panels extend from (`web/src/lib/panels/BasePanel.svelte`)
- **Panel Registry**: Central registry managing all available panels (`web/src/lib/panels/registry.ts`)
- **Panel Types**: TypeScript interfaces defining panel structure (`web/src/lib/panels/types.ts`)
- **Custom Panel Loader**: Dynamic panel compilation system (`web/src/lib/panels/CustomPanelLoader.svelte`)

### Panel Structure
```typescript
interface PanelConfig {
  id: string;                  // Unique panel identifier
  title: string;                // Display title
  icon?: string;                // Optional icon
  component: ComponentType;     // Svelte component
  defaultWidth?: number;        // Default dimensions
  defaultHeight?: number;
  minWidth?: number;           // Size constraints
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
  resizable?: boolean;         // UI capabilities
  movable?: boolean;
  closable?: boolean;
  minimizable?: boolean;
  maximizable?: boolean;
}

interface PanelState {
  id: string;
  x: number;                   // Position
  y: number;
  width: number;               // Current size
  height: number;
  isMinimized: boolean;        // UI state
  isMaximized: boolean;
  zIndex: number;              // Stacking order
}
```

## Creating a New Panel

### 1. Basic Panel Template
Create a new file in `web/src/lib/panels/YourPanel/YourPanel.svelte`:

```svelte
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { getContext } from 'svelte';

  // Panel props passed from parent
  export let panelId: string = '';
  export let data: any = {};

  // Access WebSocket if needed
  const ws = getContext('websocket');

  // Panel state
  let isLoading = false;
  let error: string | null = null;

  onMount(() => {
    console.log(`Panel ${panelId} mounted`);
    // Initialize panel
  });

  onDestroy(() => {
    console.log(`Panel ${panelId} destroyed`);
    // Cleanup
  });
</script>

<div class="your-panel">
  <h2>Your Panel</h2>
  {#if isLoading}
    <p>Loading...</p>
  {:else if error}
    <p class="error">{error}</p>
  {:else}
    <!-- Your panel content here -->
  {/if}
</div>

<style>
  .your-panel {
    padding: 1rem;
    height: 100%;
    overflow: auto;
  }

  .error {
    color: var(--error-color, #f44336);
  }
</style>
```

### 2. Register the Panel
Add to `web/src/lib/panels/registry.ts` in the `initializeBuiltins()` method:

```typescript
{
  id: 'yourPanel',
  name: 'Your Panel',
  description: 'Description of your panel',
  path: '$lib/panels/YourPanel/YourPanel.svelte',
  features: ['feature1', 'feature2'],  // Tags for categorization
  createdAt: new Date(),
  isCustom: false  // false for built-in, true for user-created
}
```

### 3. Export the Panel
Update `web/src/lib/panels/index.ts`:

```typescript
export { default as YourPanel } from './YourPanel/YourPanel.svelte';
```

## Advanced Panel Features

### WebSocket Communication
Panels can communicate with the backend via WebSocket:

```svelte
<script lang="ts">
  import { getContext } from 'svelte';

  const ws = getContext('websocket');

  function sendMessage(data: any) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'panel_message',
        panelId,
        data
      }));
    }
  }

  // Listen for messages
  $: if (ws) {
    ws.addEventListener('message', (event) => {
      const message = JSON.parse(event.data);
      if (message.panelId === panelId) {
        // Handle message for this panel
      }
    });
  }
</script>
```

### File System Access
Panels can interact with the container's file system:

```svelte
<script lang="ts">
  async function readFile(path: string) {
    const response = await fetch(`/api/files/read`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path })
    });
    return await response.text();
  }

  async function writeFile(path: string, content: string) {
    await fetch(`/api/files/write`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path, content })
    });
  }
</script>
```

### Terminal Integration
Panels can execute commands in the container:

```svelte
<script lang="ts">
  import { Terminal } from '@xterm/xterm';
  import { FitAddon } from '@xterm/addon-fit';

  let terminal: Terminal;
  let terminalElement: HTMLDivElement;

  onMount(() => {
    terminal = new Terminal({
      theme: {
        background: '#1e1e1e',
        foreground: '#d4d4d4'
      }
    });

    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    terminal.open(terminalElement);
    fitAddon.fit();

    // Connect to PTY via WebSocket
    ws.send(JSON.stringify({
      type: 'create_pty',
      panelId
    }));

    terminal.onData((data) => {
      ws.send(JSON.stringify({
        type: 'pty_input',
        panelId,
        data
      }));
    });
  });
</script>

<div bind:this={terminalElement} class="terminal-container"></div>
```

### State Management
Panels can use Svelte stores for state management:

```svelte
<script lang="ts">
  import { writable, derived } from 'svelte/store';

  // Local state store
  const items = writable<Item[]>([]);
  const selectedItem = writable<Item | null>(null);

  // Derived stores
  const itemCount = derived(items, $items => $items.length);
  const hasSelection = derived(selectedItem, $item => $item !== null);

  // Persist state to localStorage
  items.subscribe(value => {
    localStorage.setItem(`panel-${panelId}-items`, JSON.stringify(value));
  });

  onMount(() => {
    const saved = localStorage.getItem(`panel-${panelId}-items`);
    if (saved) {
      items.set(JSON.parse(saved));
    }
  });
</script>
```

## Built-in Panels Reference

### Sandbox Terminal Panel
- **Location**: `web/src/lib/Terminal.svelte` (with `sandboxed={true}`)
- **Features**: Full terminal emulator running in Docker container, safe for AI autonomy with `--dangerously-skip-permissions` mode
- **WebSocket Events**: `create_session`, `terminal_input`, `terminal_output`
- **Use Case**: Primary terminal for running AI agents and automated tasks with contained blast radius

### Admin Terminal Panel
- **Location**: `web/src/lib/Terminal.svelte` (with `sandboxed={false}`)
- **Features**: Full terminal emulator with direct host system access
- **WebSocket Events**: `create_session`, `terminal_input`, `terminal_output`
- **Use Case**: System administration tasks requiring host access (git push, NGINX builds, production deployments)
- **Warning**: ⚠️ Use with caution - has full host system access

### File Explorer
- **Location**: `web/src/lib/panels/FileExplorer/FileExplorer.svelte`
- **Features**: File tree navigation, context menus, drag-and-drop
- **State**: Current directory, selected files, expanded folders

### Code Editor
- **Location**: `web/src/lib/panels/CodeEditor/CodeEditor.svelte`
- **Features**: Monaco editor integration, syntax highlighting, tabs
- **Dependencies**: `@monaco-editor/loader`, `monaco-editor`

### Git Panel
- **Location**: `web/src/lib/panels/GitPanel/GitPanel.svelte`
- **Features**: Git status, diff viewer, commit interface
- **Commands**: Uses git CLI commands via WebSocket

### Web Browser
- **Location**: `web/src/lib/panels/WebBrowser/WebBrowser.svelte`
- **Features**: iframe-based preview, URL navigation, refresh
- **Security**: Sandboxed iframe with restricted permissions

### Settings Panel
- **Location**: `web/src/lib/panels/Settings/Settings.svelte`
- **Features**: Theme selection, preferences, keybindings
- **Storage**: LocalStorage for client-side settings

### Task Runner
- **Location**: `web/src/lib/panels/TaskRunner/TaskRunner.svelte`
- **Features**: npm scripts, custom commands, output streaming
- **Integration**: Reads package.json scripts

### Prompt Queue
- **Location**: `web/src/lib/panels/PromptQueue/PromptQueue.svelte`
- **Features**: Queue management, batch processing, history
- **Integration**: Direct Claude API integration

## Dynamic Panel Loading

### Custom Panel Compilation
The `CustomPanelLoader.svelte` component can compile and load panels at runtime:

```javascript
// Load a custom panel from source code
const panelSource = `
<script>
  export let panelId = '';
  export let data = {};
</script>

<div>
  <h2>Dynamic Panel</h2>
  <p>Panel ID: {panelId}</p>
</div>
`;

// Register and load the panel
panelRegistry.register({
  id: 'dynamic-panel',
  name: 'Dynamic Panel',
  description: 'Loaded at runtime',
  path: 'dynamic',
  features: ['custom'],
  createdAt: new Date(),
  isCustom: true,
  component: null  // Will be compiled on demand
});
```

### Panel Discovery
Panels can be discovered from:
1. Built-in registry (hardcoded in `registry.ts`)
2. LocalStorage (custom panels)
3. Remote sources (via API endpoints)
4. File system (scanning panel directories)

## CSS Variables and Theming

Panels should use CSS variables for theming consistency:

```css
/* Use these variables in your panel styles */
--panel-bg: #ffffff;
--panel-border: #e0e0e0;
--panel-radius: 8px;
--panel-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
--panel-header-bg: #f5f5f5;
--panel-title-color: #333333;
--panel-control-color: #666666;
--panel-control-hover-bg: rgba(0, 0, 0, 0.05);
--error-color: #f44336;
--success-color: #4caf50;
--warning-color: #ff9800;
--info-color: #2196f3;
```

## Event System

### Panel Events
Panels emit and listen to these events:
- `close`: Panel is being closed
- `minimize`: Panel is minimized
- `maximize`: Panel is maximized
- `restore`: Panel is restored from min/max
- `focus`: Panel gains focus
- `resize`: Panel is resized
- `move`: Panel is moved

### Global Events
Access global event bus:

```svelte
<script>
  import { getContext } from 'svelte';

  const eventBus = getContext('eventBus');

  // Emit global event
  eventBus.emit('panel:action', { panelId, action: 'save' });

  // Listen for global events
  eventBus.on('global:refresh', () => {
    // Refresh panel content
  });
</script>
```

## Best Practices

### Performance
1. **Lazy Loading**: Load heavy dependencies only when needed
2. **Virtual Scrolling**: For large lists, implement virtual scrolling
3. **Debouncing**: Debounce expensive operations (search, resize)
4. **Memoization**: Cache computed values with derived stores

### Error Handling
```svelte
<script>
  import { onMount } from 'svelte';

  let error: Error | null = null;

  async function loadData() {
    try {
      // Your async operation
    } catch (e) {
      console.error(`Panel ${panelId} error:`, e);
      error = e instanceof Error ? e : new Error(String(e));

      // Report to error tracking
      ws?.send(JSON.stringify({
        type: 'panel_error',
        panelId,
        error: error.message,
        stack: error.stack
      }));
    }
  }

  // Global error boundary
  window.addEventListener('error', (event) => {
    if (event.filename?.includes(panelId)) {
      error = new Error(event.message);
    }
  });
</script>
```

### Accessibility
1. **ARIA Labels**: Add proper ARIA labels to interactive elements
2. **Keyboard Navigation**: Support Tab, Enter, Escape keys
3. **Focus Management**: Manage focus properly when panel opens/closes
4. **Screen Reader Support**: Use semantic HTML and ARIA attributes

### Testing
```javascript
// Panel test example
import { render, fireEvent } from '@testing-library/svelte';
import YourPanel from './YourPanel.svelte';

describe('YourPanel', () => {
  it('renders correctly', () => {
    const { getByText } = render(YourPanel, {
      props: {
        panelId: 'test-panel',
        data: {}
      }
    });

    expect(getByText('Your Panel')).toBeTruthy();
  });

  it('handles user interaction', async () => {
    const { getByRole } = render(YourPanel);
    const button = getByRole('button');

    await fireEvent.click(button);
    // Assert expected behavior
  });
});
```

## Deployment Considerations

### Container Context
Remember that panels run inside Docker containers:
- File paths are relative to container filesystem
- Network requests go through container networking
- Resource limits apply (CPU, memory)
- Persistence requires volume mounts

### Security
1. **Input Validation**: Validate all user inputs
2. **XSS Prevention**: Sanitize HTML content
3. **CORS**: Handle cross-origin requests properly
4. **Secrets**: Never expose sensitive data in panel code
5. **Sandboxing**: Use iframe sandboxing for untrusted content

### Multi-Instance Support
Panels should support multiple instances:
```svelte
<script>
  // Use panelId to namespace everything
  const storeKey = `panel-${panelId}-state`;
  const wsChannel = `panel:${panelId}`;
  const elementId = `panel-element-${panelId}`;
</script>
```

## Debugging

### Development Tools
1. **Svelte DevTools**: Browser extension for debugging
2. **Console Logging**: Use structured logging
3. **WebSocket Inspector**: Monitor WS messages in browser DevTools
4. **Source Maps**: Enable for better debugging experience

### Common Issues
- **Panel Not Loading**: Check registry registration and path
- **WebSocket Errors**: Verify connection and message format
- **State Loss**: Ensure proper persistence logic
- **Memory Leaks**: Clean up event listeners in onDestroy
- **Style Conflicts**: Use scoped styles or CSS modules

## Resources
- Svelte Documentation: https://svelte.dev/docs
- SvelteKit Documentation: https://kit.svelte.dev/docs
- Monaco Editor: https://microsoft.github.io/monaco-editor/
- xterm.js: https://xtermjs.org/docs/
- MorphBox GitHub: https://github.com/instant-unicorn/morphbox