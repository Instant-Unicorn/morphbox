---
title: Installation Guide
description: Complete guide to installing MorphBox on your system
lastModified: 2025-07-21
---

# Installation Guide

MorphBox provides multiple installation methods to get you up and running quickly. Choose the method that works best for your environment.

## System Requirements

### Minimum Requirements
- **CPU**: 2 cores (4 cores recommended)
- **RAM**: 4GB (8GB recommended)
- **Storage**: 2GB free space
- **Docker**: Version 20.10 or later
- **Docker Compose**: Version 2.0 or later

### Supported Platforms
- **Linux**: Ubuntu 18.04+, Debian 10+, CentOS 8+, Fedora 30+
- **macOS**: macOS 10.15+ (Catalina or later)
- **Windows**: Windows 10/11 with WSL2

## Quick Installation

### One-Line Install (Recommended)

The fastest way to get MorphBox running:

```bash
curl -sSf https://morphbox.iu.dev/install.sh | bash
```

This script will:
- Check system requirements
- Install Docker and Docker Compose if needed
- Download and set up MorphBox
- Create necessary directories and configurations
- Start the MorphBox services

### Manual Installation

If you prefer to install manually or need more control:

#### 1. Install Dependencies

**Linux (Ubuntu/Debian):**
```bash
# Update package list
sudo apt update

# Install Docker
sudo apt install -y docker.io docker-compose

# Add your user to docker group
sudo usermod -aG docker $USER

# Log out and back in, or run:
newgrp docker
```

**Linux (CentOS/RHEL/Fedora):**
```bash
# Install Docker
sudo dnf install -y docker docker-compose

# Start and enable Docker
sudo systemctl start docker
sudo systemctl enable docker

# Add your user to docker group
sudo usermod -aG docker $USER
```

**macOS:**
```bash
# Install Docker Desktop
brew install --cask docker

# Or download from: https://docker.com/products/docker-desktop
```

**Windows:**
1. Install [Docker Desktop for Windows](https://docker.com/products/docker-desktop)
2. Enable WSL2 integration
3. Install [Windows Terminal](https://github.com/microsoft/terminal) (recommended)

#### 2. Download MorphBox

```bash
# Clone the repository
git clone https://github.com/morphbox/morphbox.git
cd morphbox

# Or download the latest release
curl -L https://github.com/morphbox/morphbox/archive/main.zip -o morphbox.zip
unzip morphbox.zip
cd morphbox-main
```

#### 3. Build and Start

```bash
# Make the startup script executable
chmod +x morphbox-start

# Start MorphBox
./morphbox-start
```

## Installation Verification

After installation, verify that MorphBox is working correctly:

### 1. Check Services

```bash
# Check if containers are running
docker ps

# You should see containers for:
# - morphbox-vm (the main container)
# - Additional services if running
```

### 2. Access Web Interface

Open your browser and navigate to:
- **Local access**: http://localhost:8008
- **External access** (if enabled): http://YOUR_IP:8008

### 3. Test Terminal Connection

The web interface should show:
- ✅ Connected status in the header
- Terminal panel with active session
- File explorer panel (if opened)

### 4. Verify Claude Authentication

```bash
# Connect to the persistent terminal
./scripts/vm-manager.sh connect

# Check Claude status
claude --version

# Test Claude authentication
claude auth status
```

## Configuration

### Environment Variables

MorphBox can be configured using environment variables or the `.morphbox.env` file:

```bash
# Create configuration file
cat > .morphbox.env << EOF
# Network settings
MORPHBOX_HOST=localhost
MORPHBOX_BIND_MODE=local

# VM settings
MORPHBOX_VM_HOST=127.0.0.1
MORPHBOX_VM_PORT=2222
MORPHBOX_VM_USER=morphbox
EOF
```

### Available Configuration Options

| Variable | Default | Description |
|----------|---------|-------------|
| `MORPHBOX_HOST` | `localhost` | Host to bind web interface |
| `MORPHBOX_BIND_MODE` | `local` | Binding mode (`local` or `external`) |
| `MORPHBOX_VM_HOST` | `127.0.0.1` | VM host address |
| `MORPHBOX_VM_PORT` | `2222` | SSH port for VM connection |
| `MORPHBOX_VM_USER` | `morphbox` | SSH username for VM |

### Directory Structure

After installation, MorphBox creates this structure:

```
morphbox/
├── docker-compose.yml          # Container configuration
├── morphbox-start              # Main startup script
├── scripts/
│   └── vm-manager.sh          # VM management utilities
├── web/                       # Web interface source
├── docs/                      # Documentation
└── workspace/                 # Your workspace (mounted in container)
```

## Troubleshooting

### Common Issues

#### Docker Permission Denied
```bash
# Add user to docker group
sudo usermod -aG docker $USER

# Log out and back in, or run:
newgrp docker
```

#### Port Already in Use
```bash
# Check what's using port 8008
sudo lsof -i :8008

# Kill the process or change MorphBox port
export MORPHBOX_PORT=8009
./morphbox-start
```

#### Container Won't Start
```bash
# Check Docker logs
docker logs morphbox-vm

# Check system resources
docker system df
docker system prune  # Clean up if needed
```

#### SSH Connection Failed
```bash
# Check VM status
./scripts/vm-manager.sh status

# Restart VM if needed
./scripts/vm-manager.sh restart
```

### Getting Help

If you encounter issues:

1. **Check logs**: Look at `web.log` and `websocket.log`
2. **Verify requirements**: Ensure Docker and system requirements are met
3. **Clean installation**: Try `./scripts/vm-manager.sh remove` and reinstall
4. **Community support**: Visit our [troubleshooting guide](/docs/support/troubleshooting)
5. **Report bugs**: [GitHub Issues](https://github.com/morphbox/morphbox/issues)

## Next Steps

Once MorphBox is installed:

1. **[Set up Claude authentication](/docs/user-guide/authentication)** - Configure persistent Claude access
2. **[Learn the basics](/docs/getting-started/quick-start)** - Get familiar with MorphBox features
3. **[Explore the panel system](/docs/user-guide/panels)** - Understand the UI components
4. **[Configure external access](/docs/user-guide/external-access)** - Access MorphBox from other devices

## Uninstallation

To completely remove MorphBox:

```bash
# Stop and remove containers
./scripts/vm-manager.sh remove

# Remove Docker volumes (this deletes all data!)
docker volume rm morphbox_claude-config morphbox_claude-home

# Remove MorphBox directory
cd ..
rm -rf morphbox
```

**⚠️ Warning**: This will permanently delete all your MorphBox data including Claude authentication and workspace files.