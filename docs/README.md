# MorphBox Documentation

Welcome to the MorphBox documentation! This directory contains comprehensive guides and references for using and developing with MorphBox.

## 📚 Documentation Structure

### Core Documentation

- **[FEATURES.md](FEATURES.md)** - Complete list of all MorphBox features and capabilities
- **[USER_MANUAL.md](USER_MANUAL.md)** - Comprehensive user guide for all features
- **[API_REFERENCE.md](API_REFERENCE.md)** - Complete API documentation for developers
- **[QUICK_REFERENCE.md](QUICK_REFERENCE.md)** - Quick lookup for commands and shortcuts
- **[CHANGELOG.md](CHANGELOG.md)** - Version history and recent changes

### Setup Guides

- **[CLAUDE_AUTH_SETUP.md](CLAUDE_AUTH_SETUP.md)** - Setting up Claude authentication
- **[EXTERNAL_ACCESS.md](EXTERNAL_ACCESS.md)** - Configuring external access and domains
- **[TERMINAL_PERSISTENCE.md](TERMINAL_PERSISTENCE.md)** - Understanding terminal session persistence

## 🚀 Quick Start

### Installation

```bash
# One-line install
curl -sSf https://morphbox.iu.dev/install.sh | bash

# NPM install
npm install -g morphbox

# Run without installing
npx morphbox
```

### Basic Usage

```bash
morphbox              # Start MorphBox
morphbox --reset      # Reset to clean state
morphbox --stop       # Stop the VM
morphbox --help       # Show help
```

### Access Web Interface

- Local: `http://localhost:8008`
- Mobile: `http://[YOUR-IP]:8008`

## 🎯 Key Features

### 1. Custom Panels with .morph Files
- Create panels using AI with natural language
- Export panels as portable `.morph` files
- Import and share panels with the community
- Version tracking with complete prompt history

### 2. Persistent Terminal Sessions
- Sessions survive browser refreshes
- Multiple independent terminals
- Full PTY support with colors
- WebSocket-based communication

### 3. Mobile Support
- Responsive design for all devices
- Virtual keyboard for special keys
- Touch-friendly interface
- Bottom sheet panel manager

### 4. Secure Sandbox
- VM isolation (Lima/WSL2)
- Network domain whitelisting
- No host filesystem access
- Clean snapshots on demand

## 📖 Learning Path

1. Start with [QUICK_REFERENCE.md](QUICK_REFERENCE.md) for command overview
2. Read [USER_MANUAL.md](USER_MANUAL.md) for detailed usage
3. Explore [FEATURES.md](FEATURES.md) to understand capabilities
4. Check [API_REFERENCE.md](API_REFERENCE.md) for custom development

## 🔧 For Developers

### Creating Custom Panels

1. Open Panel Manager
2. Click "Create New"
3. Describe your panel
4. Claude generates the code

### Panel API Example

```javascript
// Access WebSocket
const ws = new WebSocket(websocketUrl);

// Execute commands
ws.send(JSON.stringify({
  type: 'exec',
  command: 'ls -la',
  panelId: panelId
}));

// Store data
fetch(`/api/panels/data/${panelId}`, {
  method: 'POST',
  body: JSON.stringify({ data })
});
```

## 🌐 Web Documentation

The web interface includes interactive documentation at `/docs` with:
- Getting started guides
- API references
- User guides
- Troubleshooting

## 📝 Contributing

To contribute documentation:
1. Follow the existing format
2. Keep examples practical
3. Update CHANGELOG.md
4. Submit PR with clear description

## 🆘 Getting Help

- **Issues**: GitHub repository
- **Community**: MorphBox forums
- **Updates**: `npm update -g morphbox`

## 📊 Version Information

- **Current Version**: 0.9.4
- **License**: Apache 2.0
- **Requirements**: Node.js 18+, Docker

---

For the latest updates and announcements, visit [morphbox.iu.dev](https://morphbox.iu.dev)