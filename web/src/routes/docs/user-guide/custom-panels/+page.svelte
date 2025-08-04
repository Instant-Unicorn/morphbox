<script>
  import CodeBlock from '$lib/components/CodeBlock.svelte';
  
  const templates = [
    { name: 'basic', description: 'Simple panel with data display' },
    { name: 'api', description: 'Panel that fetches data from APIs' },
    { name: 'chart', description: 'Data visualization panel' },
    { name: 'form', description: 'Interactive form panel' }
  ];
  
  const examplePanel = `<!--
@panel-name: My Panel
@panel-description: A simple counter panel
@panel-icon: 🎯
@panel-category: Tools
-->

<script>
  export let panelId;
  export let data = {};
  
  let count = 0;
<\/script>

<div class="custom-panel">
  <h2>My Custom Panel</h2>
  <p>Count: {count}</p>
  <button on:click={() => count++}>Increment</button>
</div>

<style>
  .custom-panel {
    padding: 20px;
    height: 100%;
  }
<\/style>`;

  const apiExample = `// Access panel store
import { panelStore } from '$lib/stores/panels';

// Use WebSocket
import { websocket } from '$lib/websocket';

// File operations
const response = await fetch('/api/files/read', {
  method: 'POST',
  body: JSON.stringify({ path: '/some/file' })
});`;

  const communicationExample = `// Dispatch events
import { createEventDispatcher } from 'svelte';
const dispatch = createEventDispatcher();

dispatch('open', { file: 'example.txt' });`;

  const persistenceExample = `import { browser } from '$app/environment';

// Save state
if (browser) {
  localStorage.setItem(\`panel-\${panelId}\`, JSON.stringify(state));
}

// Restore state
onMount(() => {
  const saved = localStorage.getItem(\`panel-\${panelId}\`);
  if (saved) state = JSON.parse(saved);
});`;
  
  const externalLibsExample = `// Chart.js example
import Chart from 'chart.js/auto';

onMount(() => {
  new Chart(canvas, config);
});`;

  const websocketExample = `websocket.subscribe(msg => {
  if (msg.type === 'update') {
    // Handle real-time updates
  }
});`;
</script>

<svelte:head>
  <title>Custom Panels - MorphBox Documentation</title>
  <meta name="description" content="Learn how to create custom panels for MorphBox" />
</svelte:head>

# Custom Panels

Create reusable UI components that integrate seamlessly with MorphBox.

## Overview

Custom panels are single `.morph` files containing:
- HTML/JavaScript code
- Panel metadata
- Prompt history (for AI-generated panels)

Panels are stored in `~/morphbox/panels/` and hot-reload automatically.

## Quick Start

### Creating Your First Panel

1. Open Panel Manager (+ button in UI)
2. Click "Create Custom Panel"
3. Enter name and description
4. Select a template
5. Claude will generate the panel code

### Panel Example

<CodeBlock code={examplePanel} language="svelte" />

## Panel Structure

### Metadata (Required)
Embedded in HTML comments at the top:
- `@panel-name`: Display name in Panel Manager
- `@panel-description`: Brief description
- `@panel-icon`: Emoji or icon
- `@panel-category`: Panel category

### Props
Standard props passed to all panels:
- `panelId`: Unique panel instance ID
- `data`: Panel-specific data

### Styling
- Use scoped styles
- Panel container handles sizing
- Set `height: 100%` for full panel

## Available Templates

{#each templates as template}
### {template.name}
{template.description}

Use: `morphbox-panel` and select "{template.name}"
{/each}

## Development Workflow

### Hot Reloading
- Save changes to see updates instantly
- No need to restart MorphBox
- Errors shown in browser console

### Using MorphBox APIs

<CodeBlock code={apiExample} language="javascript" />

### Panel Communication

<CodeBlock code={communicationExample} language="javascript" />

## Best Practices

### Performance
- Minimize re-renders
- Use stores for shared state
- Lazy load heavy components

### Accessibility
- Add ARIA labels
- Support keyboard navigation
- Maintain focus management

### Error Handling
- Wrap async operations in try/catch
- Show user-friendly error messages
- Log errors for debugging

## Advanced Features

### State Persistence

<CodeBlock code={persistenceExample} language="javascript" />

### External Libraries

<CodeBlock code={externalLibsExample} language="javascript" />

### WebSocket Integration

<CodeBlock code={websocketExample} language="javascript" />

## AI Panel Generation

### Using Claude
- Describe functionality clearly
- Specify UI requirements
- Include data sources
- Request specific features

### Editing Generated Panels
1. Open panel in Panel Manager
2. Click "Edit"
3. Modify code and metadata
4. Save to apply changes

## .morph File Format

### Export Panels
- Click export button in Panel Manager
- Creates portable `.morph` file
- Includes code, metadata, and history

### Import Panels
- Click import button in Panel Manager
- Select `.morph` file
- Auto-handles ID conflicts

## Troubleshooting

### Panel Not Appearing
1. Check file location: `~/morphbox/panels/`
2. Verify metadata format
3. Check browser console for errors
4. Refresh Panel Manager

### Styling Issues
- Use scoped styles
- Check theme variables
- Test on mobile
- Verify height: 100%

### Performance Problems
- Profile with browser DevTools
- Reduce re-renders
- Optimize data fetching
- Use virtual scrolling for lists

<style>
  /* Component styles */
</style>