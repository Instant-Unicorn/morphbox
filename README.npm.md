# @morphbox/installer

One-command installer for MorphBox - A fast-loading safe AI sandbox for development.

## Quick Install

```bash
npx @morphbox/installer
```

That's it! This command will install MorphBox on your system.

## What is MorphBox?

MorphBox provides a secure, isolated environment for AI development with:

- 🚀 **Fast startup**: First run ~3 minutes, subsequent runs <10 seconds
- 🔒 **Network isolation**: Only allowed domains can be accessed
- 📁 **Workspace mounting**: Current directory mounted as `/workspace`
- 🔄 **Clean snapshots**: Reset to pristine state with `--reset`
- 🤖 **AI-ready**: Pre-installed with Claude Code CLI, Node.js, Python

## Requirements

### macOS
- macOS 11+ (Big Sur or later)
- Homebrew (will prompt to install if missing)

### Linux
- x86_64 or aarch64 architecture
- systemd-based distribution
- KVM support (recommended for performance)

### Windows
- Windows 10 version 2004+ or Windows 11
- WSL2 enabled
- Virtualization enabled in BIOS

## Installation Options

```bash
# Standard installation
npx @morphbox/installer

# Dry run (check requirements without installing)
npx @morphbox/installer --dry-run

# Show help
npx @morphbox/installer --help
```

## After Installation

Once installed, you can use MorphBox from any directory:

```bash
# Enter the sandbox (mounts current directory)
morphbox

# Reset to clean state
morphbox --reset

# Stop the VM
morphbox --stop
```

## What Gets Installed?

- `morphbox` command-line tool
- Lima VM manager (macOS/Linux) or WSL2 configuration (Windows)
- VM configuration files in `~/.morphbox/`
- Pre-configured Ubuntu 22.04 VM with development tools

## Troubleshooting

If the installation fails:

1. Ensure you're not running as root/administrator
2. Check that virtualization is enabled in your BIOS
3. On Windows, ensure WSL2 is properly installed
4. Visit https://morphbox.iu.dev/docs/troubleshooting

## Learn More

- Documentation: https://morphbox.iu.dev
- GitHub: https://github.com/morphbox/morphbox
- Issues: https://github.com/morphbox/morphbox/issues

## License

Apache License 2.0