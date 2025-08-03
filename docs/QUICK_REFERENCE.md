# MorphBox Quick Reference

## Installation & Startup

```bash
# Install via script
curl -sSf https://morphbox.iu.dev/install.sh | bash

# Install via npm
npm install -g morphbox

# Start MorphBox
morphbox

# Use without installing
npx morphbox
```

## Command Line Options

```bash
morphbox              # Start with web UI
morphbox --shell      # Drop into shell
morphbox --reset      # Reset to clean state
morphbox --stop       # Stop the VM
morphbox --status     # Check status
morphbox --version    # Show version
morphbox --help       # Show help
```

## Web Interface URLs

- Main Interface: `http://localhost:8008`
- WebSocket: `ws://localhost:8009`
- Mobile Access: `http://[YOUR-IP]:8008`

## Keyboard Shortcuts

### Terminal
- `Ctrl+C` - Interrupt command
- `Ctrl+D` - Exit shell
- `Ctrl+L` - Clear screen
- `Ctrl+A/E` - Start/end of line
- `Ctrl+R` - Search history

### Web UI
- `Esc` - Close modals
- `Tab` - Navigate panels

## Custom Panel Quick Start

### Create Panel
1. Open Panel Manager (grid icon)
2. Click "+ Create New"
3. Describe your panel
4. Click Create

### Example Requests
- "Create a markdown editor"
- "Build a JSON formatter"
- "Make a todo list"
- "Create an API tester"

### Panel Code Template
```html
<div id="panel">
  <h2>My Panel</h2>
  <button onclick="runCommand()">Run</button>
  <pre id="output"></pre>
</div>

<style>
  #panel {
    padding: 20px;
    color: var(--text-primary);
  }
</style>

<script>
  function runCommand() {
    const ws = new WebSocket(websocketUrl);
    ws.onmessage = (e) => {
      document.getElementById('output').textContent += e.data;
    };
    ws.onopen = () => {
      ws.send(JSON.stringify({
        type: 'exec',
        command: 'echo Hello',
        panelId: panelId
      }));
    };
  }
</script>
```

## WebSocket Commands

```javascript
// Execute command
ws.send(JSON.stringify({
  type: 'exec',
  command: 'ls -la',
  panelId: panelId
}));

// Send input
ws.send(JSON.stringify({
  type: 'input',
  data: 'text input\n',
  instanceId: instanceId
}));

// Resize terminal
ws.send(JSON.stringify({
  type: 'resize',
  cols: 80,
  rows: 24,
  instanceId: instanceId
}));
```

## API Endpoints

```bash
# Panels
GET    /api/panels              # List panels
POST   /api/panels              # Create panel
PUT    /api/panels/:id          # Update panel
DELETE /api/panels/:id          # Delete panel

# Custom Panels
GET    /api/custom-panels/list  # List custom panels
POST   /api/custom-panels/create # Create custom panel
POST   /api/custom-panels/morph  # Update panel
GET    /api/custom-panels/export/:id # Export panel
POST   /api/custom-panels/import # Import panel

# Panel Data
GET    /api/panels/data/:id     # Get panel data
POST   /api/panels/data/:id     # Save panel data
```

## CSS Variables

```css
--bg-primary      /* Main background */
--bg-secondary    /* Secondary background */
--text-primary    /* Main text color */
--text-secondary  /* Muted text */
--border-color    /* Borders */
--accent-color    /* Highlights */
```

## Allowed Domains

Default whitelist:
- api.anthropic.com
- api.openai.com
- registry.npmjs.org
- pypi.org
- github.com

Add more:
```bash
echo "example.com" >> ~/.morphbox/allowed.txt
morphbox --reset
```

## File Locations

- VM Config: `~/.morphbox/`
- Allowed Domains: `~/.morphbox/allowed.txt`
- Custom Panels: `~/morphbox/panels/`
- Workspace: `/workspace` (in VM)

## Common Issues

### Terminal not loading
```bash
morphbox --reset
```

### Can't connect on mobile
- Use computer's IP, not localhost
- Check firewall settings
- Ensure same network

### Panel errors
- Check browser console
- View panel source
- Try morphing with fix

### Claude not working
- Check Claude CLI in VM
- Verify API access
- Check allowed domains

## Tips

1. **Multiple terminals**: Open as many as needed
2. **Export panels**: Share .morph files
3. **Mobile**: Use virtual keyboard
4. **Performance**: Reset VM if slow
5. **Updates**: `npm update -g morphbox`