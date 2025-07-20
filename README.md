# MorphBox

A fast-loading safe AI sandbox for development using Lima (macOS/Linux) and WSL2 (Windows).

## Features

- 🚀 **Fast startup**: First run ~3 minutes, subsequent runs <10 seconds
- 🔒 **Network isolation**: Only allowed domains can be accessed
- 📁 **Workspace mounting**: Current directory mounted as `/workspace`
- 🔄 **Clean snapshots**: Reset to pristine state with `--reset`
- 🤖 **AI-ready**: Pre-installed with Claude Code CLI, Node.js, Python
- 🛡️ **Secure by default**: No access to host filesystem except mounted workspace

## Quick Start

### One-line install:

```bash
curl -sSf https://morphbox.iu.dev/install.sh | bash
```

### Basic usage:

```bash
# Enter the sandbox (mounts current directory as /workspace)
morphbox

# Reset to clean state
morphbox --reset

# Show help
morphbox --help

# Stop the VM
morphbox --stop
```

## Requirements

### macOS
- macOS 11+ (Big Sur or later)
- Homebrew (for Lima installation)

### Linux
- x86_64 or aarch64 architecture
- systemd-based distribution
- KVM support (for better performance)

### Windows
- Windows 10 version 2004+ or Windows 11
- WSL2 enabled
- Virtualization enabled in BIOS

## What's Included

The sandbox environment includes:

- **Languages**: Node.js 20 LTS, Python 3.10+
- **Package managers**: npm, pip
- **AI tools**: Claude Code CLI
- **Dev tools**: git, curl, build-essential
- **Python packages**: requests, numpy, pandas, jupyter

## Network Access

By default, only these domains are accessible:

- `api.anthropic.com` - Claude API
- `api.openai.com` - OpenAI API
- `api.gemini.google.com` - Google AI API
- `openrouter.ai` - OpenRouter API
- `registry.npmjs.org` - npm packages
- `pypi.org` - Python packages
- `github.com` - Git repositories
- `iu.dev` - MorphBox services

To add more allowed domains, edit `~/.morphbox/allowed.txt` and restart.

## Architecture

MorphBox uses virtualization to create an isolated environment:

- **macOS/Linux**: Uses [Lima](https://github.com/lima-vm/lima) for lightweight VMs
- **Windows**: Uses WSL2 for Linux compatibility
- **Networking**: iptables-based firewall for domain allowlisting
- **Storage**: Only current directory is accessible as `/workspace`

## Commands

```bash
morphbox [OPTIONS]

Options:
  --help      Show help message
  --version   Show version information
  --reset     Reset VM to clean snapshot
  --shell     Drop into interactive shell (default)
  --stop      Stop the MorphBox VM
  --status    Show VM status
```

## Customization

### Adding allowed domains

Edit `~/.morphbox/allowed.txt`:

```bash
# Add one domain per line
example.com
api.example.com
```

Then restart MorphBox for changes to take effect.

### Modifying VM resources

Edit `~/.morphbox/claude-vm.yaml`:

```yaml
cpus: 4          # Number of CPU cores
memory: "8GiB"   # RAM allocation
disk: "20GiB"    # Disk size
```

Then reset the VM: `morphbox --reset`

### Persisting Claude Updates

By default, Claude auto-updates on each launch. To persist updates and avoid re-downloads:

For Docker users, uncomment the persistence volumes in `docker-compose.yml`:
```yaml
volumes:
  # Uncomment these lines:
  - claude-npm-cache:/usr/local/lib/node_modules
  - claude-npm-bin:/usr/local/bin
```

For Lima/WSL2 users, Claude updates are persisted automatically in the VM image.

See [CLAUDE_PERSISTENCE.md](CLAUDE_PERSISTENCE.md) for detailed information.

## Troubleshooting

### First run takes too long

The first run downloads the VM image (~500MB) and installs packages. This is normal and only happens once.

### Permission denied errors

Make sure you're not running the installer as root:
```bash
# Wrong
sudo curl -sSf https://morphbox.iu.dev/install.sh | bash

# Correct
curl -sSf https://morphbox.iu.dev/install.sh | bash
```

### Network connectivity issues

Check that allowed domains are resolving:
```bash
# Inside MorphBox
dig api.anthropic.com
```

### VM won't start

Check VM status:
```bash
morphbox --status
```

Reset if needed:
```bash
morphbox --reset
```

## Security

MorphBox provides defense-in-depth isolation:

1. **VM isolation**: Runs in a separate virtual machine
2. **Filesystem isolation**: Only `/workspace` is accessible
3. **Network isolation**: Outbound traffic blocked except allowed domains
4. **No root access**: Runs as unprivileged user by default
5. **Clean snapshots**: Easy reset to known-good state

## Contributing

MorphBox is open source! Contributions welcome:

- Report bugs: [GitHub Issues](https://github.com/morphbox/morphbox/issues)
- Submit PRs: [GitHub](https://github.com/morphbox/morphbox)
- Documentation: [morphbox.iu.dev](https://morphbox.iu.dev)

## License

Apache License 2.0 - see [LICENSE](LICENSE) file for details.

## Support

- Documentation: [morphbox.iu.dev](https://morphbox.iu.dev)
- Issues: [GitHub Issues](https://github.com/morphbox/morphbox/issues)
- Discussions: [GitHub Discussions](https://github.com/morphbox/morphbox/discussions)

---

Made with ❤️ for safe AI development