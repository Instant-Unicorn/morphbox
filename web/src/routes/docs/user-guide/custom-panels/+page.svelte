<script>
  const templates = [
    { name: 'basic', description: 'Simple panel with data display' },
    { name: 'api', description: 'Panel that fetches data from APIs' },
    { name: 'chart', description: 'Data visualization panel' },
    { name: 'form', description: 'Interactive form panel' }
  ];
</script>

<svelte:head>
  <title>Custom Panels - MorphBox Documentation</title>
</svelte:head>

# Custom Panels

Create your own panels to extend MorphBox functionality. Panels are single-file Svelte components stored in `~/morphbox/panels/` and loaded automatically.

## Quick Start

### Using the CLI Tool
```bash
morphbox-panel
```

This interactive tool helps you:
- Choose a template
- Set panel metadata
- Create the panel file
- See it appear in MorphBox immediately

### Manual Creation
Create a `.svelte` file in `~/morphbox/panels/`:

```svelte
<!-- 
@panel-name: My Custom Panel
@panel-description: A simple custom panel
@panel-icon: 🎯
@panel-category: custom
-->

<script>
  export let panelId;
  export let data = {};
  
  let count = 0;
</script>

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
</style>
```

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
- Use scoped styles with `<style>`
- Panel container handles sizing
- Set `height: 100%` for full panel

## Available Templates

{#each templates as template}
### {template.name}
{template.description}

Use: `morphbox-panel` and select "{template.name}"
{/each}

## Development Tips

### Hot Reloading
- Changes to panel files reload automatically
- No need to restart MorphBox
- Errors shown in browser console

### Using MorphBox APIs
```javascript
// Access panel store
import { panelStore } from '$lib/stores/panels';

// Use WebSocket
import { websocket } from '$lib/websocket';

// File operations
const response = await fetch('/api/files/read', {
  method: 'POST',
  body: JSON.stringify({ path: '/some/file' })
});
```

### Panel Communication
```javascript
// Dispatch events
import { createEventDispatcher } from 'svelte';
const dispatch = createEventDispatcher();

dispatch('open', { file: 'example.txt' });
```

## Best Practices

### Performance
- Use reactive statements wisely
- Debounce expensive operations
- Clean up resources in onDestroy

### User Experience
- Provide loading states
- Handle errors gracefully
- Make it mobile-friendly
- Follow MorphBox theme

### Organization
- One feature per panel
- Clear, descriptive names
- Good documentation
- Shareable as single file

## Sharing Panels

### Export
Simply copy the `.svelte` file from `~/morphbox/panels/`

### Import
Place `.svelte` files in `~/morphbox/panels/` on any MorphBox installation

### Panel Repository
Share your panels with the community! (Coming soon)

## Advanced Features

### State Persistence
```javascript
import { browser } from '$app/environment';

// Save state
if (browser) {
  localStorage.setItem(`panel-${panelId}`, JSON.stringify(state));
}

// Restore state
onMount(() => {
  const saved = localStorage.getItem(`panel-${panelId}`);
  if (saved) state = JSON.parse(saved);
});
```

### External Libraries
```javascript
import { onMount } from 'svelte';

onMount(async () => {
  // Dynamic imports for client-side only
  const { Chart } = await import('chart.js');
  // Use library
});
```

### Real-time Updates
```javascript
// Subscribe to WebSocket events
websocket.subscribe(message => {
  if (message.type === 'data-update') {
    updatePanelData(message.payload);
  }
});
```

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