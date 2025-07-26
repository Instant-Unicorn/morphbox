# MorphBox User Manual

## Table of Contents

1. [Getting Started](#getting-started)
2. [Terminal Usage](#terminal-usage)
3. [Claude Integration](#claude-integration)
4. [Custom Panels](#custom-panels)
5. [Mobile Usage](#mobile-usage)
6. [Keyboard Shortcuts](#keyboard-shortcuts)
7. [Troubleshooting](#troubleshooting)
8. [Advanced Usage](#advanced-usage)

## Getting Started

### Installation

#### One-line install:
```bash
curl -sSf https://morphbox.iu.dev/install.sh | bash
```

#### NPM install:
```bash
npm install -g morphbox
# or use without installing:
npx morphbox
```

### First Launch

1. Open terminal and run: `morphbox`
2. Wait for VM initialization (3 minutes on first run)
3. Access web interface at `http://localhost:8008`
4. You'll see the default layout with Terminal and Claude panels

### Basic Commands

```bash
morphbox              # Start MorphBox
morphbox --reset      # Reset to clean state
morphbox --stop       # Stop the VM
morphbox --status     # Check VM status
morphbox --help       # Show help
```

## Terminal Usage

### Opening Terminals

1. Click the **Panel Manager** button (grid icon) in the header
2. Find "Terminal" in the Built-in Panels section
3. Click **Open** to create a new terminal instance

### Terminal Features

- **Multiple Instances**: Open as many terminals as needed
- **Persistent Sessions**: Terminals survive page refreshes
- **Full Color Support**: ANSI colors and formatting
- **Copy/Paste**: Standard keyboard shortcuts work
- **Resize**: Drag panel borders to resize

### Working Directory

Your current directory is mounted at `/workspace` in the VM:
```bash
cd /workspace  # Access your project files
ls -la         # List files
```

## Claude Integration

### Using Claude Panel

1. Open a Claude panel from Panel Manager
2. Type your question or request
3. Press Enter or click Send
4. Claude will respond with code, explanations, or assistance

### Claude CLI

In any terminal, you can use Claude directly:
```bash
claude "Write a Python script that counts words in a file"
```

### Tips for Claude

- Be specific in your requests
- Provide context about your project
- Ask for explanations when needed
- Use Claude to generate custom panels

## Custom Panels

### Creating a Custom Panel

1. Open Panel Manager
2. Click **+ Create New** in Custom Panels section
3. Enter a name and description
4. Describe what you want the panel to do
5. Click Create and wait for Claude to generate it

### Example Panel Requests

- "Create a markdown preview panel"
- "Make a todo list with local storage"
- "Build a color palette generator"
- "Create a JSON formatter tool"
- "Make a REST API tester"

### Modifying Panels (Morphing)

1. Click the edit icon on any custom panel
2. Describe the changes you want
3. Click Morph to update the panel
4. Version history is preserved

### Importing/Exporting Panels

#### Export a Panel:
1. Click the export icon (↓) on any custom panel
2. A `.morph` file will download
3. Share this file with others

#### Import a Panel:
1. Click **↑ Import** in Panel Manager
2. Select a `.morph` file from your computer
3. The panel will be added to your collection

### .morph File Format

The `.morph` file contains:
- Panel code (HTML/CSS/JavaScript)
- Metadata (name, description, version)
- Complete prompt history
- Creation and update timestamps

## Mobile Usage

### Accessing on Mobile

1. Find your computer's IP address
2. On mobile device, visit: `http://[YOUR-IP]:8008`
3. The interface adapts to mobile screens

### Mobile Features

- **Bottom Sheet Panel Manager**: Swipe up from bottom
- **Touch Gestures**: Tap and swipe navigation
- **Virtual Keyboard**: On-screen keyboard for terminals
- **Responsive Layout**: Automatic adjustment

### Keyboard Emulation

For special keys on mobile:
1. Tap the keyboard icon in terminal
2. Use buttons for Ctrl, Alt, Tab, Esc
3. Combine with regular keyboard

## Keyboard Shortcuts

### Terminal Shortcuts

- `Ctrl+C`: Interrupt current command
- `Ctrl+D`: Exit shell
- `Ctrl+L`: Clear screen
- `Ctrl+A`: Move to line start
- `Ctrl+E`: Move to line end
- `Ctrl+R`: Search command history

### Web Interface Shortcuts

- `Cmd/Ctrl+K`: Open command palette (coming soon)
- `Esc`: Close modals and panels
- `Tab`: Navigate between panels

## Troubleshooting

### Terminal Not Loading

1. Refresh the page
2. Check WebSocket connection in browser console
3. Restart MorphBox: `morphbox --reset`

### Claude Not Responding

1. Ensure Claude CLI is installed in VM
2. Check if Claude is configured
3. Verify network access to api.anthropic.com

### Custom Panel Errors

1. Check browser console for errors
2. View panel source for debugging
3. Try morphing with error description

### Mobile Connection Issues

1. Ensure devices are on same network
2. Check firewall settings
3. Use computer's local IP, not localhost

### VM Issues

```bash
# Check VM status
morphbox --status

# View VM logs
lima ls
lima shell morphbox

# Full reset
morphbox --stop
morphbox --reset
```

## Advanced Usage

### Adding Allowed Domains

Edit `~/.morphbox/allowed.txt`:
```bash
echo "example.com" >> ~/.morphbox/allowed.txt
morphbox --reset  # Restart to apply
```

### Custom Panel API

Panels have access to:
```javascript
// Panel ID for data storage
console.log(panelId);

// WebSocket for real-time communication
const ws = new WebSocket(websocketUrl);

// Send commands
ws.send(JSON.stringify({
  type: 'exec',
  command: 'ls -la',
  panelId: panelId
}));

// Store data
fetch(`/api/panels/data/${panelId}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ key: 'value' })
});
```

### CSS Variables

Panels can use MorphBox theme variables:
```css
--bg-primary: Background color
--bg-secondary: Secondary background
--text-primary: Main text color
--text-secondary: Muted text
--border-color: Border color
--accent-color: Accent/highlight
```

### WebSocket Events

Available WebSocket message types:
- `exec`: Execute command
- `resize`: Resize terminal
- `input`: Send terminal input
- `subscribe`: Subscribe to updates

### Creating Complex Panels

For advanced panels:
1. Use Claude to generate initial version
2. Export and edit locally
3. Test in browser console
4. Import back when ready

## Best Practices

1. **Security**: Never share sensitive data in panels
2. **Performance**: Avoid infinite loops or heavy computations
3. **Storage**: Use panel data API for persistence
4. **Sharing**: Document your panels before sharing
5. **Version Control**: Export panels regularly

## Getting Help

- **Documentation**: Access `/docs` in web interface
- **Issues**: Report at GitHub repository
- **Community**: Share panels and get help
- **Updates**: Check for updates with `npm update -g morphbox`

## Tips & Tricks

1. **Quick Panel Switch**: Double-click panel headers
2. **Maximize Panel**: Click maximize button
3. **Persistent Layout**: Layouts save automatically
4. **Multiple Projects**: Use different ports with `--port`
5. **Resource Monitor**: Check VM resources with `htop`