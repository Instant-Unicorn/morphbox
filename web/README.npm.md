# MorphBox

> Docker-based AI sandbox for development with Claude integration

MorphBox provides a secure, isolated development environment with Claude AI integration, perfect for testing code, exploring APIs, and building applications in a sandboxed Docker container.

## Quick Start

```bash
# Install MorphBox globally
npm install -g morphbox-web

# Start MorphBox (will auto-install on first run)
morphbox
```

## Features

- 🐳 **Docker-based isolation**: Run code in secure containers
- 🤖 **Claude AI integration**: Built-in Claude Code terminal
- 💾 **Persistent workspace**: Files and sessions persist
- 🌐 **Web-based IDE**: Full-featured code editor
- 🖥️ **Terminal access**: Direct container terminal
- 📁 **File management**: Built-in file explorer
- 🔐 **Secure access modes**: Local, VPN, or authenticated external

## Requirements

- Node.js 14+
- Docker Desktop or Docker Engine
- Git
- macOS, Linux, or Windows (WSL2)

## Installation

### Method 1: Global Install (Recommended)

```bash
npm install -g morphbox
morphbox  # Ready to use!
```

**Note**: If you get "command not found", your npm global bin directory may not be in PATH. See [Troubleshooting](#troubleshooting-installation) below.

### Method 2: npx (No Install)

```bash
npx morphbox
```

## Usage

### Basic Commands

```bash
# Start web interface (http://localhost:8008)
morphbox

# Terminal mode - Claude only, no web UI
morphbox --terminal

# Show all options
morphbox --help
```

### Access Modes

```bash
# Local only (default, safest)
morphbox

# VPN access (Tailscale, WireGuard, etc.)
morphbox --vpn

# External with auth (⚠️ DANGEROUS)
morphbox --external
```

## What's Included

- **Claude Code**: AI coding assistant
- **Monaco Editor**: VS Code editor in browser
- **Terminal**: Full Linux terminal
- **File Explorer**: Browse and edit files
- **Git Panel**: Visual git operations
- **Task Runner**: Background tasks
- **Custom Panels**: Create your own tools

## Known Limitations

The npm package version is currently in beta and has significant limitations:

1. **Server Startup Issues**: The web server component does not properly start in the packaged version. The server process exits immediately after initialization, preventing the web interface from being accessible.

2. **Terminal Mode Works**: Despite the web interface issues, terminal mode (`morphbox --terminal`) works correctly and provides full Claude AI functionality.

3. **Development Version Recommended**: For the full experience including the web interface, we strongly recommend running from source:
   ```bash
   git clone https://github.com/yourusername/morphbox.git
   cd morphbox
   ./morphbox-start
   ```

## Troubleshooting Installation

### "command not found" Error
If you get "command not found" after installing, your npm global bin directory isn't in PATH:

```bash
# Find your npm prefix
npm config get prefix
# Add the bin directory to PATH
export PATH="$(npm config get prefix)/bin:$PATH"
```

### "ENOTEMPTY" Error During Installation
If you see "directory not empty" errors:

```bash
# Clean up with sudo
sudo rm -rf ~/.npm-global/lib/node_modules/morphbox* ~/.npm-global/lib/node_modules/.morphbox-*

# Reinstall
npm install -g morphbox
```

## Workaround

Until the packaging issues are resolved, you can use MorphBox in terminal mode:

```bash
morphbox --terminal
```

This will launch Claude directly in your terminal without the web interface.

## Security

MorphBox runs in Docker containers isolated from your host system. By default, only local access is allowed. External access requires explicit flags and authentication.

⚠️ **WARNING**: The `--external` flag exposes your environment to the network. Use with extreme caution!

## Documentation

- [GitHub](https://github.com/MicahBly/morphbox)
- [User Manual](https://github.com/MicahBly/morphbox/blob/main/docs/USER_MANUAL.md)
- [API Reference](https://github.com/MicahBly/morphbox/blob/main/docs/API_REFERENCE.md)

## License

Apache-2.0