# MorphBox Features Documentation

## Overview

MorphBox is a secure AI development sandbox that provides an isolated environment for running code with AI assistants. It combines virtualization, web-based interfaces, and custom panel systems to create a powerful development platform.

## Core Features

### 1. Secure Sandbox Environment

- **VM Isolation**: Uses Lima (macOS/Linux) or WSL2 (Windows) for complete isolation
- **Network Filtering**: Whitelist-based domain access control
- **Workspace Mounting**: Only current directory mounted as `/workspace`
- **Clean Snapshots**: Reset to pristine state with `--reset`
- **Fast Startup**: ~3 minutes first run, <10 seconds subsequent runs

### 2. Web-Based Interface

- **Terminal Panels**: Multiple terminal instances with full PTY support
- **Claude Integration**: Built-in Claude AI assistant for code help
- **Code Editor**: Monaco-based editor with syntax highlighting
- **Custom Panels**: Create and share custom tools and interfaces
- **Responsive Design**: Works on desktop, tablet, and mobile devices

### 3. Terminal Features

- **Persistent Sessions**: Terminal sessions survive page refreshes
- **Multiple Instances**: Run multiple independent terminal sessions
- **WebSocket Communication**: Real-time bidirectional communication
- **Full PTY Support**: Complete terminal emulation with colors and control sequences
- **SSH Agent**: Persistent SSH agent for secure key management
- **Keyboard Emulation**: On-screen keyboard for mobile devices

### 4. Custom Panels System

#### 4.1 Panel Creation
- **AI-Generated Panels**: Create panels using natural language descriptions
- **Template System**: HTML/CSS/JavaScript templates
- **Live Preview**: See changes in real-time
- **Panel Morphing**: Modify existing panels with AI assistance

#### 4.2 .morph File Format (NEW!)
- **Portable Panels**: Single file contains code, metadata, and history
- **Import/Export**: Share panels with the community
- **Version Control**: Track panel evolution with prompt history
- **Backward Compatible**: Supports legacy .js/.json format

#### 4.3 Panel Features
- **WebSocket Access**: Panels can communicate with backend
- **Data Persistence**: Store panel-specific data
- **Theming Support**: Uses MorphBox CSS variables
- **Error Handling**: Built-in error states and loading indicators

### 5. Panel Manager

- **Organized Interface**: Built-in and custom panels in separate sections
- **Quick Actions**: Open, edit, export, or delete panels
- **Import Function**: Load .morph files from disk
- **Mobile-Friendly**: Bottom sheet pattern on mobile devices
- **Search & Filter**: Find panels quickly (coming soon)

### 6. AI Integration

- **Claude CLI**: Pre-installed Claude command-line interface
- **Context Awareness**: AI understands your workspace structure
- **Code Generation**: Generate complete applications from prompts
- **Code Modification**: Iteratively improve code with AI
- **Multi-Model Support**: Ready for OpenAI, Google AI, and OpenRouter

### 7. Development Tools

#### Pre-installed Languages & Tools:
- **Node.js 20 LTS**: JavaScript runtime
- **Python 3.10+**: With pip package manager
- **Git**: Version control system
- **Build Tools**: gcc, make, build-essential
- **Network Tools**: curl, wget, netcat

#### Pre-installed Packages:
- **Node.js**: Express, React, Vue, TypeScript
- **Python**: requests, numpy, pandas, jupyter, matplotlib
- **AI SDKs**: Anthropic, OpenAI Python libraries

### 8. Mobile Support

- **Responsive UI**: Adapts to screen size
- **Touch Gestures**: Swipe and tap navigation
- **Virtual Keyboard**: On-screen keyboard emulation
- **Panel Management**: Mobile-optimized bottom sheet
- **Terminal Scaling**: Automatic font size adjustment

### 9. Security Features

- **Domain Whitelisting**: Only approved domains accessible
- **No Host Access**: VM cannot access host filesystem
- **Isolated Networking**: Separate network namespace
- **Clean Environment**: Each reset provides pristine state
- **Secure Defaults**: No unnecessary services running

### 10. Session Management

- **Persistent State**: Sessions survive browser refreshes
- **Auto-Reconnect**: Automatic WebSocket reconnection
- **Session Recovery**: Restore terminals after disconnect
- **Multi-Tab Support**: Work across browser tabs
- **Background Execution**: Processes continue when tab inactive

### 11. Package Management

#### NPM Integration:
- **Global Install**: `npm install -g morphbox`
- **NPX Support**: `npx morphbox`
- **Auto-Updates**: Version checking and updates
- **Dependency Management**: Minimal dependencies

#### Distribution:
- **Cross-Platform**: macOS, Linux, Windows support
- **Single Binary**: No complex installation
- **Environment Detection**: Automatic platform detection

### 12. Customization

- **Allowed Domains**: Edit `~/.morphbox/allowed.txt`
- **VM Configuration**: Modify Lima/WSL2 settings
- **Panel Themes**: CSS variable customization
- **Keyboard Shortcuts**: Customizable key bindings
- **Layout Persistence**: Save and restore layouts

## Advanced Features

### WebSocket API

Panels can access the WebSocket API for real-time communication:

```javascript
const ws = new WebSocket(websocketUrl);
ws.send(JSON.stringify({
  type: 'exec',
  command: 'ls -la',
  panelId: panelId
}));
```

### Panel Data Storage

Panels can store persistent data:

```javascript
// Save data
fetch(`/api/panels/data/${panelId}`, {
  method: 'POST',
  body: JSON.stringify({ key: 'value' })
});

// Load data
const response = await fetch(`/api/panels/data/${panelId}`);
const data = await response.json();
```

### Custom Panel Example

```html
<div id="panel-content">
  <h2>My Custom Panel</h2>
  <button id="run-command">Run Command</button>
  <pre id="output"></pre>
</div>

<style>
  #panel-content {
    padding: 20px;
    color: var(--text-primary);
    background: var(--bg-primary);
  }
</style>

<script>
  document.getElementById('run-command').onclick = () => {
    const ws = new WebSocket(websocketUrl);
    ws.onmessage = (event) => {
      document.getElementById('output').textContent += event.data;
    };
    ws.onopen = () => {
      ws.send(JSON.stringify({
        type: 'exec',
        command: 'echo "Hello from custom panel!"',
        panelId: panelId
      }));
    };
  };
</script>
```

## Upcoming Features

- **Panel Marketplace**: Browse and install community panels
- **Collaborative Editing**: Real-time collaboration
- **Extension System**: Plugin architecture
- **Cloud Sync**: Sync settings and panels
- **Advanced Theming**: Complete UI customization
- **Performance Metrics**: Resource usage monitoring

## Getting Help

- **Documentation**: Available at `/docs` in the web interface
- **GitHub Issues**: Report bugs and request features
- **Community Panels**: Share and discover at morphbox.iu.dev

## Version History

- **v0.7.1**: .morph file format, import/export functionality
- **v0.7.0**: Mobile support, keyboard emulation
- **v0.6.0**: Custom panels system
- **v0.5.0**: Persistent sessions
- **v0.4.0**: Claude integration
- **v0.3.0**: Web interface
- **v0.2.0**: Terminal multiplexing
- **v0.1.0**: Initial release