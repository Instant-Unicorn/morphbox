# MorphBox 🚀

[![npm version](https://img.shields.io/npm/v/morphbox.svg)](https://www.npmjs.com/package/morphbox)
[![Docker](https://img.shields.io/badge/Docker-Required-blue)](https://www.docker.com/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-macOS%20|%20Linux%20|%20Windows-lightgrey)](https://github.com/MicahBly/morphbox)

> **Run Claude AI in a secure Docker sandbox with full development tools** - Perfect for AI-assisted coding, learning, and experimentation in an isolated environment.

![MorphBox Demo](docs/images/morphbox-demo.gif)

## ✨ Why MorphBox?

MorphBox gives you a **secure, isolated environment** where Claude AI can help you code without accessing your main system. Think of it as a playground where you can:

- 🤖 **Code with Claude** - Built-in AI assistant for pair programming
- 🔒 **Stay Secure** - Complete isolation from your host system
- 📁 **Access Your Files** - Mount any directory as workspace
- 🚀 **Start Fast** - Up and running in under 30 seconds
- 💾 **Keep Your Work** - Persistent storage across sessions

## 🎯 Quick Start

```bash
# Install globally via npm
npm install -g morphbox

# Start MorphBox (mounts current directory)
morphbox

# Or use without installing
npx morphbox
```

That's it! MorphBox will:
1. ✅ Check Docker is installed
2. ✅ Build the secure container
3. ✅ Launch the web interface at `http://localhost:8008`
4. ✅ Mount your current directory as `/workspace`

## 🎮 Usage Examples

### Basic Commands

```bash
morphbox              # Start with web interface (default)
morphbox --terminal   # Start Claude in your terminal
morphbox --config     # Generate morphbox.yml configuration file
morphbox --vpn        # Bind to VPN interface for team access
morphbox --help       # Show all options
```

### Real-World Scenarios

**Learn a New Framework:**
```bash
cd my-react-project
morphbox
# Ask Claude: "Help me convert this to Next.js 14 with App Router"
```

**Code Review:**
```bash
cd legacy-codebase
morphbox
# Ask Claude: "Review this code for security issues and suggest improvements"
```

**Build a Feature:**
```bash
cd my-app
morphbox
# Ask Claude: "Help me add user authentication with JWT tokens"
```

## 🛠️ Features

### Core Capabilities

| Feature | Description |
|---------|------------|
| **🤖 Claude Integration** | Full Claude AI assistant with code-aware context |
| **🐳 Docker Isolation** | Complete sandbox - no access to host system |
| **📁 Workspace Mounting** | Your current directory available as `/workspace` |
| **🖥️ Terminal Access** | Full bash terminal with tmux support |
| **🌐 Web Interface** | Modern UI with panels for terminals and Claude |
| **⚡ Fast Startup** | Container starts in seconds after first build |
| **💾 Persistent Storage** | Claude config and data persists between sessions |
| **🔐 Security First** | Network isolation with configurable access |

### Access Modes

- **Local (default)** - Accessible only from your machine (`localhost`)
- **VPN Mode** - Auto-binds to VPN interface for secure team access
- **External** ⚠️ - Expose to entire network (requires `--auth` flag and confirmation)

### Pre-installed Tools

- **Languages**: Node.js 20 LTS, Python 3.12, Go, Rust
- **Package Managers**: npm, pip, cargo, yarn, pnpm
- **Dev Tools**: git, vim, tmux, curl, wget, jq
- **Build Tools**: gcc, make, cmake
- **Claude Tools**: Claude CLI pre-configured

## 📋 Requirements

- **Docker Desktop** or **Docker Engine** (20.10+)
- **Node.js** (14+ for npm installation)
- **Operating System**:
  - macOS 11+ (Big Sur or later)
  - Linux (Ubuntu 20.04+, Debian 11+, Fedora 34+)
  - Windows 10/11 with WSL2

## 📦 Installation

### Method 1: npm (Recommended)

```bash
npm install -g morphbox
```

### Method 2: Direct from Source

```bash
git clone https://github.com/MicahBly/morphbox.git
cd morphbox/web
npm install
npm link
```

### Method 3: No Installation (npx)

```bash
npx morphbox
```

## 🔧 Configuration

### Container Configuration (New in v0.9.6)

Generate a configuration file to customize your container:

```bash
morphbox --config  # Creates morphbox.yml in current directory
```

Edit `morphbox.yml` to customize:
- Install additional packages (vim, htop, etc.)
- Set environment variables
- Configure network allowlist/blocklist
- Set resource limits (memory, CPU)
- Pre-install language runtimes (Node.js, Python, Go)
- Add custom startup scripts

Example `morphbox.yml`:
```yaml
container:
  packages:
    - postgresql-client
    - redis-tools
  environment:
    EDITOR: vim
network:
  allowlist:
    - github.com
    - "*.googleapis.com"
security:
  memory_limit: "2g"
development:
  runtimes:
    node: "20"
    python: "3.11"
```

### Environment Variables

Create a `.morphbox.env` file in your project:

```env
# Network binding
MORPHBOX_HOST=localhost
MORPHBOX_PORT=8008

# Security
MORPHBOX_AUTH_ENABLED=false
MORPHBOX_AUTH_USERNAME=admin

# Claude API (optional - for API access)
ANTHROPIC_API_KEY=your-key-here
```

## 🚀 Advanced Usage

### Terminal Mode

For a pure terminal experience without the web UI:

```bash
morphbox --terminal
```

This launches Claude directly in your terminal with full access to the mounted workspace.

### External Access Mode

⚠️ **WARNING: Security Risk** - Only use on trusted networks!

External mode exposes MorphBox to your network (not just localhost):

```bash
# Requires --auth flag for security
morphbox --external --auth

# You'll see a security warning and must confirm:
# "WARNING: External mode exposes MorphBox to your network!"
# "This could allow others on your network to access your development environment."
```

**Security Considerations**:
- **ALWAYS** use `--auth` flag with external mode
- Only use on trusted, private networks
- Consider using VPN mode instead for team access
- External mode binds to `0.0.0.0` (all network interfaces)
- Without `--auth`, external mode will be rejected

### Team Collaboration (VPN Mode)

Safer alternative for team access using VPN:

```bash
morphbox --vpn --auth
```

This automatically detects and binds to your VPN interface only, limiting access to VPN-connected clients. Team members can connect to `http://your-vpn-ip:8008` with authentication.

### API Integration

MorphBox exposes a REST API for automation:

```bash
# Start a session
curl -X POST http://localhost:8008/api/sessions

# Send a command to Claude
curl -X POST http://localhost:8008/api/claude/message \
  -H "Content-Type: application/json" \
  -d '{"message": "Write a Python script to process CSV files"}'
```

## 🐛 Troubleshooting

### Common Issues

**Docker not found:**
```bash
# Install Docker Desktop from https://docker.com
# Or on Linux:
curl -fsSL https://get.docker.com | sh
```

**Permission denied:**
```bash
# Add user to docker group (Linux)
sudo usermod -aG docker $USER
# Then log out and back in
```

**Port already in use:**
```bash
# MorphBox automatically finds next available port
# Or specify manually:
MORPHBOX_PORT=8080 morphbox
```

**Need to reset/rebuild container:**
```bash
# See Docker Cleanup Guide for detailed instructions
docker stop morphbox-vm && docker rm morphbox-vm
docker rmi $(docker images -q morphbox)
```

See [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) for more solutions.

## 📖 Documentation

- [Getting Started Guide](docs/GETTING_STARTED.md)
- [Configuration Guide](docs/CONFIGURATION.md)
- [Docker Cleanup Guide](docs/DOCKER_CLEANUP.md)
- [Tutorials](docs/TUTORIALS.md)
- [API Documentation](docs/API.md)
- [Architecture Overview](docs/ARCHITECTURE.md)
- [Troubleshooting](docs/TROUBLESHOOTING.md)

## 🤝 Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

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

## 📜 License

MIT © [Micah Bly](https://github.com/MicahBly)

## 🙏 Acknowledgments

- Built with [Claude AI](https://claude.ai) by Anthropic
- Powered by [Docker](https://docker.com)
- UI framework: [SvelteKit](https://kit.svelte.dev)
- Terminal: [xterm.js](https://xtermjs.org)

## 🔗 Links

- [GitHub Repository](https://github.com/MicahBly/morphbox)
- [NPM Package](https://www.npmjs.com/package/morphbox)
- [Issue Tracker](https://github.com/MicahBly/morphbox/issues)
- [Discussions](https://github.com/MicahBly/morphbox/discussions)

---

<p align="center">
  Made with ❤️ for developers who want to code with AI safely
</p>