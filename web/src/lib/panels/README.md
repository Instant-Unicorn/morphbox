# MorphBox Panel System

The panel system provides a flexible way to create draggable, resizable, and customizable panels for the MorphBox interface.

## Overview

The panel system consists of:
- **BasePanel.svelte**: A reusable base component that provides common panel functionality
- **types.ts**: TypeScript definitions for panel configurations and states
- **index.ts**: Exports and panel registry management

## Creating a New Panel

### 1. Create Your Panel Component

Create a new Svelte component that will be the content of your panel:

```svelte
<!-- MyCustomPanel.svelte -->
<script lang="ts">
  // Your panel logic here
  export let data: any; // Panel-specific props
</script>

<div class="my-custom-panel">
  <h2>My Custom Panel</h2>
  <!-- Your panel content -->
</div>

<style>
  .my-custom-panel {
    /* Your styles */
  }
</style>
```

### 2. Register Your Panel

Register your panel configuration in your application:

```typescript
import { registerPanel } from '$lib/panels';
import MyCustomPanel from './MyCustomPanel.svelte';

registerPanel({
  id: 'my-custom-panel',
  title: 'My Custom Panel',
  icon: '🎨', // Optional emoji or icon
  component: MyCustomPanel,
  defaultWidth: 400,
  defaultHeight: 300,
  minWidth: 300,
  minHeight: 200,
  resizable: true,
  movable: true,
  closable: true,
  minimizable: true,
  maximizable: true
});
```

### 3. Use the Panel

There are two ways to use panels:

#### Option A: Direct Usage with BasePanel

```svelte
<script>
  import { BasePanel } from '$lib/panels';
  import MyCustomPanel from './MyCustomPanel.svelte';
  
  const config = {
    id: 'my-panel',
    title: 'My Panel',
    component: MyCustomPanel,
    // ... other config
  };
  
  const state = {
    id: 'my-panel',
    x: 100,
    y: 100,
    width: 400,
    height: 300,
    isMinimized: false,
    isMaximized: false,
    zIndex: 1
  };
</script>

<BasePanel {config} {state} on:close={handleClose}>
  <MyCustomPanel />
</BasePanel>
```

#### Option B: Using a Panel Manager (Recommended)

Create a panel manager component to handle multiple panels:

```svelte
<!-- PanelManager.svelte -->
<script lang="ts">
  import { BasePanel, type PanelState } from '$lib/panels';
  import { writable } from 'svelte/store';
  
  const panels = writable<PanelState[]>([]);
  
  function openPanel(id: string) {
    // Add panel to state
  }
  
  function closePanel(id: string) {
    // Remove panel from state
  }
</script>

{#each $panels as panel}
  <BasePanel
    config={getPanel(panel.id)}
    state={panel}
    on:close={() => closePanel(panel.id)}
    on:focus={() => focusPanel(panel.id)}
  >
    <svelte:component this={getPanel(panel.id).component} />
  </BasePanel>
{/each}
```

## Panel Configuration Options

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `id` | string | required | Unique identifier for the panel |
| `title` | string | required | Panel title displayed in header |
| `icon` | string | optional | Icon or emoji displayed before title |
| `component` | Component | required | Svelte component to render as content |
| `defaultWidth` | number | 400 | Initial panel width in pixels |
| `defaultHeight` | number | 300 | Initial panel height in pixels |
| `minWidth` | number | 200 | Minimum allowed width |
| `minHeight` | number | 150 | Minimum allowed height |
| `maxWidth` | number | Infinity | Maximum allowed width |
| `maxHeight` | number | Infinity | Maximum allowed height |
| `resizable` | boolean | true | Whether panel can be resized |
| `movable` | boolean | true | Whether panel can be dragged |
| `closable` | boolean | true | Whether panel can be closed |
| `minimizable` | boolean | true | Whether panel can be minimized |
| `maximizable` | boolean | true | Whether panel can be maximized |

## Panel Events

BasePanel emits the following events:

- `close`: Fired when the close button is clicked
- `minimize`: Fired when the minimize button is clicked
- `maximize`: Fired when the maximize button is clicked
- `restore`: Fired when restoring from maximized state
- `focus`: Fired when the panel gains focus
- `move`: Fired when the panel is moved (includes `{ x, y }`)
- `resize`: Fired when the panel is resized (includes `{ width, height }`)

## Styling

The panel system uses CSS custom properties for theming:

```css
:root {
  --panel-bg: #ffffff;
  --panel-border: #e0e0e0;
  --panel-radius: 8px;
  --panel-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  --panel-shadow-hover: 0 6px 16px rgba(0, 0, 0, 0.15);
  --panel-header-bg: #f5f5f5;
  --panel-title-color: #333333;
  --panel-control-color: #666666;
  --panel-control-hover-bg: rgba(0, 0, 0, 0.05);
  --panel-control-active-bg: rgba(0, 0, 0, 0.1);
  --panel-close-hover-bg: #ff4444;
  --panel-resize-color: #cccccc;
  --panel-resize-grip-color: #999999;
}
```

## Example: Terminal Panel

Here's a complete example of creating a terminal panel:

```svelte
<!-- TerminalPanel.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  
  let terminal: HTMLDivElement;
  let input = '';
  let output: string[] = [];
  
  function executeCommand() {
    output = [...output, `$ ${input}`, 'Command executed'];
    input = '';
  }
  
  onMount(() => {
    // Initialize terminal
  });
</script>

<div class="terminal" bind:this={terminal}>
  <div class="output">
    {#each output as line}
      <div class="line">{line}</div>
    {/each}
  </div>
  <div class="input-line">
    <span class="prompt">$</span>
    <input
      bind:value={input}
      on:keydown={(e) => e.key === 'Enter' && executeCommand()}
      placeholder="Type a command..."
    />
  </div>
</div>

<style>
  .terminal {
    height: 100%;
    background: #1e1e1e;
    color: #d4d4d4;
    font-family: monospace;
    display: flex;
    flex-direction: column;
  }
  
  .output {
    flex: 1;
    overflow-y: auto;
    padding: 8px;
  }
  
  .line {
    margin-bottom: 4px;
  }
  
  .input-line {
    display: flex;
    align-items: center;
    padding: 8px;
    border-top: 1px solid #333;
  }
  
  .prompt {
    margin-right: 8px;
    color: #569cd6;
  }
  
  input {
    flex: 1;
    background: transparent;
    border: none;
    color: inherit;
    outline: none;
    font-family: inherit;
  }
</style>
```

Then register and use it:

```typescript
import { registerPanel } from '$lib/panels';
import TerminalPanel from './TerminalPanel.svelte';

registerPanel({
  id: 'terminal',
  title: 'Terminal',
  icon: '💻',
  component: TerminalPanel,
  defaultWidth: 600,
  defaultHeight: 400,
  minWidth: 400,
  minHeight: 300
});
```

## Best Practices

1. **Unique IDs**: Always use unique IDs for your panels to avoid conflicts
2. **State Management**: Consider using a store for managing panel states in complex applications
3. **Performance**: For panels with heavy content, implement lazy loading or virtualization
4. **Accessibility**: Ensure your panel content is keyboard navigable and screen reader friendly
5. **Responsive Design**: Test panels on different screen sizes and adjust constraints accordingly

## Advanced Usage

### Custom Panel Header

To create a panel with a custom header, extend BasePanel:

```svelte
<script>
  import BasePanel from '$lib/panels/BasePanel.svelte';
</script>

<BasePanel {config} {state}>
  <div slot="header" class="custom-header">
    <!-- Your custom header content -->
  </div>
  <div slot="default">
    <!-- Panel content -->
  </div>
</BasePanel>
```

### Panel Persistence

Save and restore panel states:

```typescript
// Save panel states
const states = getAllPanelStates();
localStorage.setItem('panel-states', JSON.stringify(states));

// Restore panel states
const saved = localStorage.getItem('panel-states');
if (saved) {
  const states = JSON.parse(saved);
  restorePanelStates(states);
}
```

### Panel Communication

Use Svelte stores or events for inter-panel communication:

```typescript
// Create a shared store
import { writable } from 'svelte/store';
export const sharedData = writable({});

// In Panel A
sharedData.update(data => ({ ...data, message: 'Hello from A' }));

// In Panel B
$: message = $sharedData.message;
```