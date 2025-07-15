# PanelMenu Component

A dropdown menu component for managing panels in the MorphBox IDE interface.

## Features

- **Dropdown Menu**: Triggered by a + button that rotates when open
- **Modal Dialogs**: Each action opens a modal with appropriate UI
- **Panel Creation Wizard**: Create custom panels with name, type, and icon selection
- **Panel Gallery**: Visual grid for selecting existing panels to add
- **Panel Management**: View and organize active and available panels
- **Dark Theme**: Styled to match the IDE theme with VS Code-like appearance

## Usage

```svelte
<script>
  import PanelMenu from '$lib/components/PanelMenu.svelte';
  
  // Define available panels
  const availablePanels = [
    {
      id: 'terminal-1',
      title: 'Terminal',
      icon: '💻',
      component: TerminalComponent
    },
    // ... more panels
  ];
  
  // Track active panels
  let activePanels = ['terminal-1'];
  
  // Handle events
  function handleCreatePanel(event) {
    const { name, type, icon } = event.detail;
    // Create new panel logic
  }
  
  function handleAddPanel(event) {
    const { id } = event.detail;
    activePanels = [...activePanels, id];
  }
  
  function handleRemovePanel(event) {
    const { id } = event.detail;
    activePanels = activePanels.filter(p => p !== id);
  }
</script>

<PanelMenu
  {availablePanels}
  {activePanels}
  on:createPanel={handleCreatePanel}
  on:addPanel={handleAddPanel}
  on:removePanel={handleRemovePanel}
  on:configurePanel={handleConfigurePanel}
/>
```

## Props

- `availablePanels`: Array of PanelConfig objects representing all registered panels
- `activePanels`: Array of panel IDs currently active in the workspace

## Events

- `createPanel`: Fired when creating a new panel
  - `detail`: `{ name: string, type: string, icon: string }`
- `addPanel`: Fired when adding an existing panel
  - `detail`: `{ id: string }`
- `removePanel`: Fired when removing a panel
  - `detail`: `{ id: string }`
- `configurePanel`: Fired when configuring a panel
  - `detail`: `{ id: string }`

## Menu Options

1. **Create Panel**: Opens a wizard for creating custom panels
   - Panel name input
   - Panel type selection (Custom, Terminal, Editor, Browser, etc.)
   - Icon picker with emoji options

2. **Add Panel**: Opens a gallery view of available panels
   - Grid layout showing panel icons and names
   - Click to select and add to workspace

3. **Remove Panel**: Lists active panels for removal
   - Shows only currently active panels
   - Click to select and remove

4. **Manage Panels**: Comprehensive panel management view
   - Two-column layout: Active and Available panels
   - Quick actions for each panel (configure, add, remove)

## Styling

The component uses CSS variables and follows the VS Code dark theme:
- Background: `#1e1e1e` (modal) and `#252526` (dropdown)
- Borders: `#3e3e42`
- Primary color: `#007acc`
- Text: `#cccccc` (primary) and `#858585` (secondary)

## Accessibility

- ARIA labels for buttons and interactive elements
- Keyboard navigation support
- Focus management in modals
- Screen reader friendly

## Dependencies

- Svelte transitions (`fade`, `fly`)
- Custom `clickOutside` action for closing dropdown
- TypeScript for type safety