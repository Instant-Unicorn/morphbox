# MorphBox Custom Panels Documentation

## Overview

MorphBox supports custom panels that allow users to extend the application with their own functionality. Custom panels are:

- **Single-file components** - Each panel is a self-contained `.svelte` file
- **Stored outside the project** - Located in `~/morphbox/panels/` to avoid git conflicts
- **Hot-reloadable** - Changes are detected and loaded automatically
- **Easy to share** - Just share the `.svelte` file with others
- **Reusable** - Works across all MorphBox projects

## Architecture

### Panel Storage

Custom panels are stored in: `~/morphbox/panels/`

This location is:
- Outside your project directory (no git conflicts)
- Shared across all MorphBox instances
- Automatically created when needed
- Watched for changes in development

### Panel Format

Each panel is a Svelte component with embedded metadata:

```svelte
<!--
@morphbox-panel
id: unique-panel-id
name: Panel Display Name
description: What this panel does
version: 1.0.0
author: Your Name
features: [api, visualization]
-->

<script lang="ts">
  // Panel implementation
</script>

<template>
  <!-- Panel UI -->
</template>

<style>
  /* Panel styles */
</style>
```

### Loading System

1. **File Watcher** - Monitors `~/morphbox/panels/` for changes
2. **Metadata Parser** - Extracts panel information from comments
3. **Panel Registry** - Registers panels with the system
4. **Dynamic Loading** - Loads panels on-demand when opened

## Creating Custom Panels

### Method 1: Using Claude Code CLI

The easiest way to create custom panels:

```bash
cd ~/morphbox/panels
claude "Create a MorphBox panel that shows cryptocurrency prices with live updates"
```

### Method 2: Using the CLI Tool

Install the MorphBox panel CLI:

```bash
# Run the installer
~/morphbox/install-cli.sh

# Or manually copy to your PATH
cp ~/morphbox/morphbox-panel ~/bin/
chmod +x ~/bin/morphbox-panel
```

Then create panels:

```bash
# Interactive panel creation
morphbox-panel create

# List all panels
morphbox-panel list

# Delete a panel
morphbox-panel delete panel-id

# Open panels directory
morphbox-panel open
```

### Method 3: Manual Creation

Create a `.svelte` file in `~/morphbox/panels/` with the required structure.

## Panel API

### Required Props

Every panel receives these props:

```typescript
export let panelId: string;      // Unique instance ID
export let data: any = {};       // Data passed when opening
```

### Lifecycle Hooks

```typescript
import { onMount, onDestroy } from 'svelte';

onMount(() => {
  // Panel initialized
});

onDestroy(() => {
  // Cleanup resources
});
```

### Accessing Panel State

```typescript
import { panelStore } from '$lib/stores/panels';

// Update own state
panelStore.updatePanel(panelId, {
  content: { ...data, newValue: 123 }
});
```

## Examples

### Basic Panel

```svelte
<!--
@morphbox-panel
id: hello-world
name: Hello World
description: A simple example panel
version: 1.0.0
features: []
-->

<script lang="ts">
  export let panelId: string;
  export let data: any = {};
  
  let count = 0;
</script>

<div class="panel">
  <h2>Hello World</h2>
  <p>Count: {count}</p>
  <button on:click={() => count++}>Increment</button>
</div>

<style>
  .panel {
    padding: 20px;
  }
</style>
```

### API Integration

```svelte
<!--
@morphbox-panel
id: weather-display
name: Weather Display
description: Shows current weather
version: 1.0.0
features: [api, async]
-->

<script lang="ts">
  import { onMount } from 'svelte';
  
  export let panelId: string;
  export let data: any = {};
  
  let weather = null;
  let loading = true;
  
  async function fetchWeather() {
    try {
      const response = await fetch(`/api/weather?city=${data.city || 'London'}`);
      weather = await response.json();
    } finally {
      loading = false;
    }
  }
  
  onMount(() => {
    fetchWeather();
  });
</script>

{#if loading}
  <p>Loading...</p>
{:else if weather}
  <div>
    <h3>{weather.city}</h3>
    <p>{weather.temp}°C</p>
  </div>
{/if}
```

### Real-time Updates

```svelte
<!--
@morphbox-panel
id: system-monitor
name: System Monitor
description: Real-time system metrics
version: 1.0.0
features: [monitoring, real-time]
-->

<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  
  export let panelId: string;
  export let data: any = {};
  
  let metrics = { cpu: 0, memory: 0 };
  let interval;
  
  function updateMetrics() {
    // Fetch metrics from API
    metrics.cpu = Math.random() * 100;
    metrics.memory = Math.random() * 100;
  }
  
  onMount(() => {
    interval = setInterval(updateMetrics, 1000);
  });
  
  onDestroy(() => {
    clearInterval(interval);
  });
</script>

<div>
  <p>CPU: {metrics.cpu.toFixed(1)}%</p>
  <p>Memory: {metrics.memory.toFixed(1)}%</p>
</div>
```

## Current Limitations

### Development Mode

Currently, custom panels run in a placeholder mode showing:
- Panel metadata
- Source code preview
- Instructions for full compilation

### Full Compilation

For production use, panels need server-side compilation. This requires:
1. Svelte compiler integration
2. Security sandboxing
3. Build pipeline setup

## Future Enhancements

### Planned Features

1. **Runtime Compilation** - Compile Svelte components in the browser
2. **Panel Marketplace** - Share and discover community panels
3. **Panel Templates** - More built-in templates for common use cases
4. **Visual Panel Builder** - Drag-and-drop panel creation
5. **Panel Permissions** - Control what APIs panels can access

### Security Considerations

- Panels run in the same context as MorphBox
- Future versions will add sandboxing
- Review panel code before installation
- Only install panels from trusted sources

## Troubleshooting

### Panel Not Appearing

1. Check file location: `~/morphbox/panels/*.svelte`
2. Verify metadata format (must be first thing in file)
3. Check browser console for errors
4. Ensure MorphBox has file system permissions

### Panel Errors

1. Check browser DevTools console
2. Verify all required props are handled
3. Ensure proper Svelte syntax
4. Test with a simple panel first

### Hot Reload Not Working

1. Check if file watcher is running
2. Save file to trigger reload
3. Hard refresh browser if needed
4. Check terminal for watcher errors

## Best Practices

1. **Unique IDs** - Use descriptive, unique panel IDs
2. **Error Handling** - Always handle API failures gracefully
3. **Loading States** - Show feedback during async operations
4. **Resource Cleanup** - Clear timers and subscriptions
5. **Theme Support** - Use CSS variables for colors
6. **Responsive Design** - Test at different panel sizes
7. **Documentation** - Include usage instructions in description

## Contributing

To contribute to the custom panel system:

1. **Report Issues** - File bugs on GitHub
2. **Share Panels** - Post your panels in discussions
3. **Improve Docs** - Submit documentation PRs
4. **Feature Ideas** - Suggest enhancements

## Resources

- [Svelte Documentation](https://svelte.dev/docs)
- [MorphBox GitHub](https://github.com/yourusername/morphbox)
- [Panel Examples](~/morphbox/panels/)
- [Community Panels](https://github.com/topics/morphbox-panel)