# MorphBox

> Docker-based AI sandbox for development with Claude integration

MorphBox provides a secure, isolated development environment with Claude AI integration, perfect for testing code, exploring APIs, and building applications in a sandboxed Docker container.

## Quick Start

```bash
# Install MorphBox globally
npm install -g morphbox

# Run the installer to set up Docker environment
morphbox-installer

# Start MorphBox
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
morphbox-installer
```

### Method 2: npx (No Install)

```bash
npx morphbox-installer
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

## Security

MorphBox runs in Docker containers isolated from your host system. By default, only local access is allowed. External access requires explicit flags and authentication.

⚠️ **WARNING**: The `--external` flag exposes your environment to the network. Use with extreme caution!

## Documentation

- [GitHub](https://github.com/MicahBly/morphbox)
- [User Manual](https://github.com/MicahBly/morphbox/blob/main/docs/USER_MANUAL.md)
- [API Reference](https://github.com/MicahBly/morphbox/blob/main/docs/API_REFERENCE.md)

## License

Apache-2.0