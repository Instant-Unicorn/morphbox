---
title: Panel System Guide
description: Understanding MorphBox's flexible panel-based interface
lastModified: 2025-07-21
---

# Panel System Guide

MorphBox uses a flexible panel-based interface that allows you to create custom layouts tailored to your workflow. This guide covers everything you need to know about working with panels.

## Overview

The panel system is the heart of MorphBox's user interface. It provides:

- **Flexible layouts**: Arrange panels in any configuration
- **Responsive design**: Automatically adapts to screen size
- **Persistent state**: Panel layouts are saved between sessions
- **Tab support**: Multiple panels can share the same space
- **Mobile optimization**: Touch-friendly on all devices

## Panel Types

### Built-in Panels

MorphBox comes with several pre-built panels:

#### 1. Terminal
- Full bash shell with persistence
- GNU Screen session management
- Claude CLI integration
- Command history and auto-completion

#### 2. Claude
- Direct interface to Claude AI
- Conversation history
- Code highlighting in responses
- File context awareness

#### 3. File Explorer
- Tree view of your workspace
- Drag-and-drop support
- Context menus for file operations
- Integrated with other panels

#### 4. Code Editor
- Monaco Editor (VS Code engine)
- Syntax highlighting for 50+ languages
- IntelliSense and error detection
- Multiple file tabs

#### 5. Settings
- Theme customization
- Keyboard shortcuts
- Panel preferences
- Custom panel builder

#### 6. Session Manager
- View all active terminal sessions
- Monitor session health
- Kill unused sessions
- Auto-refresh every 10 seconds

### Custom Panels

Create your own panels using the visual builder. See the [Custom Panels Guide](/docs/user-guide/custom-panels) for details.

## Creating Panels

### Using the Panel Dropdown

1. Click the **panel icon** (▼) in the top-right corner
2. Select the panel type you want to create
3. The panel appears in the workspace

### Keyboard Shortcut

Press `Ctrl+P` to quickly open the panel dropdown.

### Programmatic Creation

Panels can also be created via the API:

```javascript
// Example: Create a terminal panel
fetch('/api/panels', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    type: 'terminal',
    position: { x: 0, y: 0 },
    size: { width: 600, height: 400 }
  })
});
```

## Panel Layout

### Grid System

Panels arrange themselves in a flexible grid:

- **Auto-positioning**: New panels find available space
- **Snap to grid**: Panels align for clean layouts
- **Responsive**: Grid adjusts to screen size
- **No overlapping**: Panels never cover each other

### Layout Examples

#### Side-by-Side Development
```
┌─────────────┬─────────────┐
│   Terminal  │ Code Editor │
│             │             │
│             │             │
└─────────────┴─────────────┘
```

#### Full Stack Setup
```
┌─────────────┬─────────────┐
│ File Expl.  │ Code Editor │
├─────────────┼─────────────┤
│   Terminal  │   Claude    │
└─────────────┴─────────────┘
```

#### Mobile Layout
```
┌─────────────┐
│ Code Editor │
├─────────────┤
│   Terminal  │
└─────────────┘
```

## Panel Features

### Resizing

- **Drag edges**: Click and drag panel borders
- **Minimum size**: Panels have minimum dimensions
- **Maintain aspect**: Hold Shift while resizing
- **Double-click edge**: Auto-fit to content

### Tabs

Multiple panels can share the same space using tabs:

1. Drag one panel onto another
2. Tabs appear at the top
3. Click tabs to switch between panels
4. Drag tabs to reorder

### Panel Actions

Each panel has action buttons in its header:

- **Minimize** (—): Collapse to title bar
- **Maximize** (□): Fill entire workspace
- **Close** (×): Remove panel
- **Menu** (⋮): Panel-specific options

### Context Menus

Right-click on panels for additional options:

- Duplicate panel
- Export panel state
- Lock panel position
- Change panel settings

## Panel State Management

### Automatic Saving

Panel layouts are automatically saved:

- Position and size
- Open tabs
- Panel-specific settings
- Minimized/maximized state

### Manual Save/Load

Save and restore layouts:

```javascript
// Save current layout
const layout = panels.saveLayout();
localStorage.setItem('my-layout', JSON.stringify(layout));

// Load saved layout
const saved = localStorage.getItem('my-layout');
if (saved) {
  panels.loadLayout(JSON.parse(saved));
}
```

### Workspace Profiles

Create different layouts for different tasks:

1. Settings → Workspaces
2. Create new workspace
3. Arrange panels
4. Save workspace
5. Switch between workspaces instantly

## Mobile Considerations

### Responsive Behavior

On mobile devices, panels:

- Stack vertically by default
- Use full screen width
- Show one panel at a time
- Support swipe navigation

### Touch Interactions

- **Tap**: Select and activate
- **Long press**: Open context menu
- **Swipe**: Navigate between panels
- **Pinch**: Zoom in code editor

### Mobile Optimizations

- Larger touch targets
- Simplified controls
- Virtual keyboard aware
- Reduced animations

## Performance Tips

### Managing Many Panels

1. **Close unused panels**: Free up resources
2. **Use tabs**: Group related panels
3. **Minimize when not needed**: Reduces rendering
4. **Limit terminal panels**: They use more resources

### Browser Considerations

- **Chrome/Edge**: Best performance
- **Firefox**: Good, occasional layout issues
- **Safari**: Works, but slower animations
- **Mobile browsers**: Limit to 3-4 panels

## Advanced Features

### Panel Communication

Panels can communicate with each other:

```javascript
// Send message from one panel
panelBus.emit('file:open', { path: '/src/app.js' });

// Listen in another panel
panelBus.on('file:open', (data) => {
  editor.openFile(data.path);
});
```

### Custom Panel Positions

Override auto-positioning:

```javascript
panels.create('terminal', {
  position: { x: 100, y: 50 },
  size: { width: 800, height: 600 },
  locked: true
});
```

### Panel Constraints

Set layout constraints:

```javascript
panels.setConstraints({
  maxPanels: 6,
  minPanelWidth: 300,
  minPanelHeight: 200,
  gridSize: 20
});
```

## Keyboard Shortcuts

### Global Panel Shortcuts

- `Ctrl+P`: Open panel menu
- `Ctrl+W`: Close active panel
- `Ctrl+Tab`: Next panel
- `Ctrl+Shift+Tab`: Previous panel
- `Alt+1-9`: Switch to panel by number

### Panel-Specific Shortcuts

Each panel type has its own shortcuts. See [Keyboard Shortcuts Guide](/docs/user-guide/keyboard-shortcuts) for complete list.

## Troubleshooting

### Panel Won't Open

1. Check if maximum panels reached
2. Ensure enough screen space
3. Try refreshing the browser
4. Check browser console for errors

### Layout Issues

1. Reset to default layout (Settings → Reset)
2. Clear browser cache
3. Check zoom level (reset to 100%)
4. Disable browser extensions

### Performance Problems

1. Reduce number of open panels
2. Close resource-intensive panels (terminal, editor)
3. Use a modern browser
4. Check system resources

## Best Practices

### Workflow Organization

1. **Group related panels**: Use tabs for similar tools
2. **Save layouts**: Create reusable workspace profiles
3. **Use shortcuts**: Learn keyboard shortcuts for efficiency
4. **Mobile-first**: Design layouts that work on all devices

### Resource Management

1. **Close when done**: Don't leave panels open unnecessarily
2. **Monitor sessions**: Use Session Manager to track resources
3. **Periodic cleanup**: Remove old terminal sessions
4. **Browser tabs**: Limit MorphBox to one browser tab

## Next Steps

- Learn about [Custom Panels](/docs/user-guide/custom-panels)
- Explore [Built-in Panels](/docs/user-guide/builtin-panels) in detail
- Master [Keyboard Shortcuts](/docs/user-guide/keyboard-shortcuts)
- Understand the [Panel API](/docs/api/panels) for integration