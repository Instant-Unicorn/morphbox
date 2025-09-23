# MorphBox

[![npm version](https://img.shields.io/npm/v/morphbox.svg)](https://www.npmjs.com/package/morphbox)
[![Docker](https://img.shields.io/badge/Docker-Required-blue)](https://www.docker.com/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-macOS%20|%20Linux%20|%20Windows-lightgrey)](https://github.com/MicahBly/morphbox)

> **Open-source Docker sandbox for experimenting with Claude AI development tools - enabling the community to explore AI-assisted coding in isolated environments with autonomous prompt processing capabilities.**

## 🎯 Overview

MorphBox provides a secure, containerized development environment with Claude AI integration. It empowers developers to experiment with AI-assisted development tools, run autonomous coding sessions via the Prompt Queue, and work from any location through its web-based interface.

## ✨ Key Features

### Core Capabilities

- **🤖 Claude Integration** - Built-in Claude AI assistant for pair programming
- **🐳 Docker Isolation** - Complete sandbox environment, isolated from host system
- **📁 Workspace Mounting** - Mount any directory as `/workspace` for development
- **🌐 Web Interface** - Modern browser-based UI with customizable panels
- **🔄 Prompt Queue** - Queue multiple prompts for autonomous sequential processing
- **⚡ Fast Startup** - Container starts in seconds after initial build
- **💾 Persistent Storage** - Settings and data persist between sessions

### Web Interface Panels

- **Terminal** - Full bash terminal with tmux support
- **Claude Chat** - Interactive Claude AI assistant
- **Prompt Queue** - Queue and automate multiple Claude prompts
- **Code Editor** - Built-in Monaco editor for file editing
- **File Explorer** - Navigate and manage workspace files
- **Git Panel** - Version control integration
- **Task Runner** - Execute and monitor development tasks
- **Web Browser** - Embedded browser for testing
- **Settings** - Configure MorphBox behavior

### Prompt Queue System

The Prompt Queue is a unique feature that enables autonomous AI sessions:

1. Add multiple prompts to the queue via the web panel
2. Click Play to start processing
3. Claude works through each prompt automatically
4. The queue detects when Claude is idle and sends the next prompt
5. Perfect for overnight refactoring, test generation, or documentation tasks

## 📋 Prerequisites

- **Docker Desktop** or **Docker Engine** (20.10+)
- **Node.js** (14+) for npm installation
- **Operating System**:
  - macOS 11+ (Big Sur or later)
  - Linux (Ubuntu 20.04+, Debian 11+, Fedora 34+)
  - Windows 10/11 with WSL2

## 🚀 Quick Start

```bash
# Install globally via npm
npm install -g morphbox

# Start MorphBox (mounts current directory)
morphbox

# Access the web interface
# http://localhost:8008
```

## 📦 Installation Options

### Via npm (Recommended)

```bash
npm install -g morphbox
```

### Via yarn

```bash
yarn global add morphbox
```

### Quick Run (npx)

```bash
npx morphbox
```

### From Source

```bash
git clone https://github.com/MicahBly/morphbox.git
cd morphbox/web
npm install
npm link
```

## 🎮 Usage

### Basic Commands

```bash
morphbox              # Start with web interface (default)
morphbox --terminal   # Start Claude in terminal mode
morphbox --config     # Generate morphbox.yml configuration file
morphbox --vpn        # Bind to VPN interface for team access
morphbox --external --auth  # Expose to network with authentication
morphbox --help       # Show all options
```

### Access Modes

- **Local (default)** - Accessible only from localhost
- **VPN Mode** (`--vpn`)- Auto-binds to VPN interface for secure team access
- **External** (`--external --auth`) - Expose to network with authentication (requires confirmation)

## 🔧 Configuration

### Generate Configuration File

```bash
morphbox --config  # Creates morphbox.yml in current directory
```

### Example `morphbox.yml`

```yaml
container:
  packages:
    - vim
    - htop
    - postgresql-client
  environment:
    EDITOR: vim

network:
  allowlist:
    - github.com
    - npmjs.org
    - pypi.org

security:
  memory_limit: "2g"
  cpu_limit: 2

development:
  runtimes:
    node: "20"
    python: "3.11"
  npm_packages:
    - typescript
    - prettier
```

### Environment Variables

Create `.morphbox.env` in your project:

```env
# Network binding
MORPHBOX_HOST=localhost
MORPHBOX_PORT=8008

# Authentication
MORPHBOX_AUTH_ENABLED=false
MORPHBOX_AUTH_USERNAME=admin

# Claude API (optional)
ANTHROPIC_API_KEY=your-key-here
```

## 🛠️ Pre-installed Tools

- **Languages**: Node.js 20 LTS, Python 3.12
- **Package Managers**: npm, pip, yarn, pnpm
- **Dev Tools**: git, vim, tmux, curl, wget, jq
- **Build Tools**: gcc, make, cmake

## 🚀 Advanced Usage

### Terminal Mode

For a pure terminal experience without the web UI:

```bash
morphbox --terminal
```

### Team Collaboration

Share your development environment with your team via VPN:

```bash
morphbox --vpn --auth
# Team members can connect to http://your-vpn-ip:8008
```

### Remote Access

For working from mobile or remote locations:

```bash
# Secure external access
morphbox --external --auth

# You'll see a security warning and must confirm
# Team members need authentication to connect
```

## 🐛 Troubleshooting

### Docker not found

```bash
# Install Docker Desktop from https://docker.com
# Or on Linux:
curl -fsSL https://get.docker.com | sh
```

### Permission denied

```bash
# Add user to docker group (Linux)
sudo usermod -aG docker $USER
# Then log out and back in
```

### Port already in use

```bash
# MorphBox automatically finds next available port
# Or specify manually:
MORPHBOX_PORT=8080 morphbox
```

### Reset container

```bash
docker stop morphbox-vm && docker rm morphbox-vm
docker rmi $(docker images -q morphbox)
```

## 📖 Documentation

- [Getting Started Guide](docs/GETTING_STARTED.md)
- [Configuration Guide](docs/CONFIGURATION.md)
- [Docker Cleanup Guide](docs/DOCKER_CLEANUP.md)
- [Tutorials](docs/TUTORIALS.md)
- [API Documentation](docs/API.md)
- [Troubleshooting](docs/TROUBLESHOOTING.md)

## 🤝 Community & Contributing

We welcome contributions! The goal is to empower the community to explore and extend AI-assisted development capabilities.

### How to Contribute

```bash
# Fork and clone
git clone https://github.com/yourusername/morphbox.git
cd morphbox

# Install dependencies
npm install

# Run tests
npm test

# Start development
npm run dev
```

See [CONTRIBUTING.md](docs/CONTRIBUTING.md) for detailed guidelines.

### Community Resources

- **Website**: [iu.dev/morphbox](https://iu.dev/morphbox)
- **GitHub**: [github.com/MicahBly/morphbox](https://github.com/MicahBly/morphbox)
- **Issues**: [GitHub Issues](https://github.com/MicahBly/morphbox/issues)
- **Discussions**: [GitHub Discussions](https://github.com/MicahBly/morphbox/discussions)

## 🚧 Roadmap

- Enhanced Prompt Queue with visual workflow builder
- Multi-model support beyond Claude
- Collaborative coding sessions
- Plugin marketplace for community extensions
- Mobile-optimized interface improvements

## 📜 License

MIT © [Micah Bly](https://github.com/MicahBly)

## 🙏 Acknowledgments

- Built with [Claude AI](https://claude.ai) by Anthropic
- Powered by [Docker](https://docker.com)
- UI framework: [SvelteKit](https://kit.svelte.dev)
- Terminal: [xterm.js](https://xtermjs.org)

---

<p align="center">
  <strong>Empowering the community to explore AI-assisted development</strong>
</p>