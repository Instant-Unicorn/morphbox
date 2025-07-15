# Panel Creation Wizard Integration Example

To integrate the Panel Creation Wizard into your MorphBox layout, follow these steps:

## 1. Import the PanelManager component in MorphBoxLayout.svelte:

```svelte
<script lang="ts">
  import Terminal from '$lib/Terminal.svelte';
  import PanelManager from '$lib/components/PanelManager.svelte';
  // ... other imports
  
  let panelManager: PanelManager;
</script>
```

## 2. Add the PanelManager to your header:

```svelte
<header class="morphbox-header">
  <div class="header-left">
    <h1>MorphBox</h1>
    <span class="version">v2.0</span>
  </div>
  <div class="header-center">
    <span class="connection-status" class:connected={isConnected}>
      {isConnected ? '● Connected' : '○ Disconnected'}
    </span>
  </div>
  <div class="header-right">
    <PanelManager bind:this={panelManager} />
    <button class="btn btn-sm">Settings</button>
  </div>
</header>
```

## 3. The PanelManager provides:

- A button to open the panel manager dropdown
- List of built-in and custom panels
- "Create New" button to open the wizard
- Options to open, export, or delete panels

## 4. Panel Creation Wizard Features:

### Step 1: Choose Panel Type
- Custom Panel: Build from scratch
- From Template: Start with pre-configured templates

### Step 2: Panel Details
- Panel name
- Description
- Auto-generated file path preview

### Step 3: Select Features
- State Management
- API Access
- WebSocket
- File System
- Terminal
- Data Visualization
- Form Handling
- Authentication

### Step 4: Generated Code Preview
- Review the generated Svelte component
- Copy code to clipboard
- Create and register the panel

## 5. Panel Storage:

Currently, generated panels are stored in localStorage. In a production environment, you would:

1. Create an API endpoint to save panel files to the file system
2. Implement dynamic component loading from the saved files
3. Add version control integration

## 6. Usage Example:

```javascript
// In your API server (e.g., Express.js)
app.post('/api/panels/save', async (req, res) => {
  const { path, content } = req.body;
  const fullPath = path.join(process.cwd(), 'src', path);
  
  // Create directory if it doesn't exist
  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  
  // Write the file
  await fs.writeFile(fullPath, content, 'utf8');
  
  res.json({ success: true });
});
```

## 7. Dynamic Panel Loading:

To load custom panels dynamically:

```javascript
// In your panel component
async function loadCustomPanel(panelId: string) {
  const definition = panelRegistry.get(panelId);
  if (!definition) return;
  
  try {
    // Dynamic import
    const module = await import(/* @vite-ignore */ definition.path);
    const PanelComponent = module.default;
    
    // Now you can use PanelComponent in your Svelte component
  } catch (error) {
    console.error('Failed to load panel:', error);
  }
}
```