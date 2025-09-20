# MorphBox

[![npm version](https://img.shields.io/npm/v/morphbox.svg)](https://www.npmjs.com/package/morphbox)
[![Docker](https://img.shields.io/badge/Docker-Required-blue)](https://www.docker.com/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-macOS%20|%20Linux%20|%20Windows-lightgrey)](https://github.com/MicahBly/morphbox)

> **An open-source development sandbox empowering the community to explore Anthropic Claude SDK features through secure, isolated environments - work from anywhere, including mobile and remote setups.**

## 🎯 Project Vision

MorphBox is an open-source project designed to democratize AI-assisted development by providing a secure, containerized environment where developers can experiment with Claude AI SDK features and custom integrations. Whether you're working from a mobile device, remote server, or local machine, MorphBox ensures consistent, isolated development experiences.

### Key Innovation: Prompt Queue System

Our **Prompt Queue** feature enables autonomous, long-running AI sessions that continue processing tasks even when you're away. Queue up complex workflows, let Claude work through them systematically, and return to completed results - perfect for overnight builds, large refactoring tasks, or continuous integration workflows.

## 🚀 Features

### Core Capabilities

- **🤖 Claude SDK Integration** - Full access to Anthropic's Claude API with community-driven extensions
- **📱 Mobile & Remote Ready** - Access your development environment from any device, anywhere
- **🔄 Prompt Queue System** - Queue multiple tasks for autonomous execution over extended periods
- **🐳 Complete Isolation** - Docker-based sandboxing protects your host system
- **🛠️ SDK Experimentation** - Test and develop custom Claude integrations safely
- **👥 Community Driven** - Share configurations, prompts, and workflows with the community
- **⚡ Rapid Prototyping** - Pre-configured development environment with all essential tools
- **🔌 Extensible Architecture** - Plugin system for custom tools and integrations

### Prompt Queue System

The Prompt Queue allows you to:
- Queue multiple complex tasks for sequential execution
- Run long-duration workflows autonomously
- Schedule AI-assisted tasks for off-hours processing
- Chain dependent operations with conditional logic
- Monitor progress remotely via web interface

Example workflow:
```bash
# Queue a complete refactoring session
morphbox queue add "Analyze codebase for performance bottlenecks"
morphbox queue add "Refactor identified bottlenecks with best practices"
morphbox queue add "Generate comprehensive test suite"
morphbox queue add "Run tests and fix any failures"
morphbox queue start --autonomous  # Let it run unattended
```

## 📋 Prerequisites

- **Docker Desktop** or **Docker Engine** (20.10+)
- **Node.js** (14+) for npm installation
- **Operating System**:
  - macOS 11+ (Big Sur or later)
  - Linux (Ubuntu 20.04+, Debian 11+, Fedora 34+)
  - Windows 10/11 with WSL2
  - iOS/Android (via web interface)

## 🚀 Quick Start

```bash
# Install globally via npm
npm install -g morphbox

# Start MorphBox (mounts current directory)
morphbox

# Access from browser (including mobile)
# http://localhost:8008
```

For mobile/remote access:
```bash
# Bind to network interface for remote access
morphbox --vpn --auth

# Or expose via secure tunnel (recommended for mobile)
morphbox --tunnel
```

## 📦 Installation

### Recommended: npm/yarn

```bash
npm install -g morphbox
# or
yarn global add morphbox
```

### From Source

```bash
git clone https://github.com/MicahBly/morphbox.git
cd morphbox
npm install
npm link
```

### Quick Run (npx)

```bash
npx morphbox
```

## 🔧 Configuration

### Community Configurations

Browse and share configurations at [iu.dev/morphbox](https://iu.dev/morphbox)

### Custom SDK Features

Create `morphbox.yml` to define custom Claude integrations:

```yaml
# morphbox.yml
sdk:
  claude:
    model: claude-3-opus
    custom_tools:
      - code_analyzer
      - test_generator
    prompt_templates:
      - refactoring
      - documentation

prompt_queue:
  max_concurrent: 2
  timeout_minutes: 120
  retry_failed: true

development:
  runtimes:
    node: "20"
    python: "3.12"
  frameworks:
    - react
    - django
    - fastapi
```

### Environment Variables

```bash
# .morphbox.env
ANTHROPIC_API_KEY=your-key-here
MORPHBOX_QUEUE_ENABLED=true
MORPHBOX_REMOTE_ACCESS=true
MORPHBOX_AUTH_TOKEN=secure-token-here
```

## 📱 Mobile & Remote Development

### Mobile Access

1. Start MorphBox with tunnel support:
```bash
morphbox --tunnel --auth
```

2. Access the provided URL from any mobile browser
3. Full IDE features including:
   - Code editing with mobile-optimized UI
   - Terminal access with virtual keyboard support
   - Claude AI assistant with voice input
   - File management and version control

### Remote Server Deployment

```bash
# On remote server
docker run -d \
  -p 8008:8008 \
  -v $(pwd):/workspace \
  -e MORPHBOX_AUTH=true \
  morphbox/morphbox:latest
```

## 🤝 Community & Contribution

### Get Involved

- **Share Configurations**: Submit your custom setups at [iu.dev/morphbox](https://iu.dev/morphbox)
- **Contribute Code**: See [CONTRIBUTING.md](CONTRIBUTING.md)
- **Report Issues**: [GitHub Issues](https://github.com/MicahBly/morphbox/issues)
- **Join Discussions**: [GitHub Discussions](https://github.com/MicahBly/morphbox/discussions)

### Community Resources

- **Configuration Library**: Pre-built configs for various development scenarios
- **Prompt Templates**: Curated prompts for common development tasks
- **SDK Extensions**: Community-developed Claude integrations
- **Workflow Automations**: Shareable prompt queue workflows

## 📖 Documentation

- [Getting Started Guide](docs/GETTING_STARTED.md)
- [Prompt Queue Documentation](docs/PROMPT_QUEUE.md)
- [SDK Integration Guide](docs/SDK_INTEGRATION.md)
- [Mobile Development Guide](docs/MOBILE_GUIDE.md)
- [API Documentation](docs/API.md)
- [Architecture Overview](docs/ARCHITECTURE.md)

## 🛡️ Security

MorphBox prioritizes security through:
- Complete Docker isolation
- No host system access by default
- Encrypted communication for remote access
- Authentication required for network exposure
- Regular security audits by the community

## 🚧 Roadmap

- [ ] Enhanced prompt queue with visual workflow builder
- [ ] Native mobile apps (iOS/Android)
- [ ] Multi-model support (GPT-4, Gemini, etc.)
- [ ] Collaborative coding sessions
- [ ] VS Code extension
- [ ] Kubernetes deployment options
- [ ] Enhanced SDK plugin marketplace

## 📜 License

MIT © [Micah Bly](https://github.com/MicahBly)

## 🙏 Acknowledgments

- Built with [Claude AI](https://claude.ai) by Anthropic
- Powered by [Docker](https://docker.com)
- UI framework: [SvelteKit](https://kit.svelte.dev)
- Terminal: [xterm.js](https://xtermjs.org)
- Community contributions from developers worldwide

## 🔗 Links

- [Official Website](https://iu.dev/morphbox)
- [GitHub Repository](https://github.com/MicahBly/morphbox)
- [NPM Package](https://www.npmjs.com/package/morphbox)
- [Community Configurations](https://iu.dev/morphbox)
- [Discord Community](https://discord.gg/morphbox)

---

<p align="center">
  <strong>Empowering developers to explore AI possibilities, together</strong><br>
  Built by the community, for the community
</p>