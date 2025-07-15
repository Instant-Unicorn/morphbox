---
title: System Requirements
description: Hardware and software requirements for running MorphBox
lastModified: 2024-12-19
---

# System Requirements

MorphBox is designed to run efficiently on modern systems. Here are the detailed requirements for optimal performance.

## Minimum Requirements

### Hardware
- **CPU**: 2 cores (x86_64 or ARM64)
- **RAM**: 4GB available memory
- **Storage**: 4GB free disk space
- **Network**: Internet connection for initial setup

### Software
- **Docker**: Version 20.10 or later
- **Docker Compose**: Version 2.0 or later
- **Operating System**: See platform-specific requirements below

## Recommended Specifications

### For Best Performance
- **CPU**: 4+ cores with virtualization support
- **RAM**: 8GB+ available memory
- **Storage**: 10GB+ free SSD space
- **Network**: Stable broadband connection

### For Development Teams
- **CPU**: 6+ cores
- **RAM**: 16GB+ total system memory
- **Storage**: 20GB+ free SSD space
- **Network**: High-speed connection for multiple users

## Platform-Specific Requirements

### Linux

#### Supported Distributions
- **Ubuntu**: 18.04 LTS or later
- **Debian**: 10 (Buster) or later
- **CentOS**: 8 or later
- **RHEL**: 8 or later
- **Fedora**: 30 or later
- **openSUSE**: Leap 15.0 or later
- **Arch Linux**: Current releases

#### Linux Prerequisites
```bash
# Check kernel version (should be 3.10+)
uname -r

# Check Docker support
docker --version

# Check available memory
free -h

# Check disk space
df -h
```

#### Additional Linux Requirements
- **Kernel**: Linux kernel 3.10 or later
- **cgroups**: Control Groups v1 or v2
- **Namespaces**: Support for network and PID namespaces
- **User permissions**: Ability to add user to docker group

### macOS

#### Supported Versions
- **macOS Catalina**: 10.15 or later
- **macOS Big Sur**: 11.0 or later
- **macOS Monterey**: 12.0 or later
- **macOS Ventura**: 13.0 or later
- **macOS Sonoma**: 14.0 or later

#### macOS Prerequisites
```bash
# Check macOS version
sw_vers

# Check available memory
vm_stat

# Check disk space
df -h

# Check Docker Desktop
docker --version
```

#### macOS-Specific Requirements
- **Hardware**: Intel or Apple Silicon (M1/M2)
- **Virtualization**: Hardware virtualization enabled
- **Docker Desktop**: Latest version recommended
- **Xcode Command Line Tools**: For git and development tools

### Windows

#### Supported Versions
- **Windows 10**: Version 2004 (build 20H1) or later
- **Windows 11**: All versions

#### Windows Prerequisites
```powershell
# Check Windows version
winver

# Check available memory
systeminfo | findstr "Total Physical Memory"

# Check disk space
dir C:\ /-c

# Check WSL2
wsl --version
```

#### Windows-Specific Requirements
- **WSL2**: Windows Subsystem for Linux 2 enabled
- **Virtualization**: Hardware virtualization enabled in BIOS
- **Hyper-V**: Hyper-V compatible processor
- **Docker Desktop**: With WSL2 backend
- **PowerShell**: PowerShell 5.1 or later (or Windows Terminal)

## Network Requirements

### Outbound Connections
MorphBox requires access to these domains:

#### Essential Services
- **Docker Hub**: `registry.docker.io` (container images)
- **GitHub**: `github.com` (source code and updates)
- **Anthropic**: `api.anthropic.com` (Claude API)

#### Package Managers
- **npm**: `registry.npmjs.org` (Node.js packages)
- **PyPI**: `pypi.org` (Python packages)
- **APT**: `archive.ubuntu.com`, `security.ubuntu.com` (Linux packages)

#### Optional Services
- **OpenAI**: `api.openai.com` (if using OpenAI integration)
- **Google**: `api.gemini.google.com` (if using Gemini)

### Port Requirements

#### Default Ports
- **Web Interface**: 8008 (configurable)
- **WebSocket**: 8009 (internal)
- **SSH**: 2222 (container access)

#### Firewall Configuration
```bash
# Allow MorphBox ports (if using external access)
sudo ufw allow 8008/tcp
sudo ufw allow 8009/tcp

# For development only
sudo ufw allow 2222/tcp
```

## Performance Considerations

### CPU Usage
- **Idle**: ~5-10% of one core
- **Active development**: ~20-40% of available cores
- **AI processing**: Can utilize multiple cores

### Memory Usage
- **Base container**: ~200MB RAM
- **Web interface**: ~100MB RAM
- **Claude sessions**: ~50-100MB per session
- **Peak usage**: Up to 2GB during intensive tasks

### Storage Usage
- **Base installation**: ~1GB
- **Docker images**: ~500MB
- **Persistent data**: ~100MB (grows with usage)
- **Workspace files**: Depends on your projects

### Network Usage
- **Initial setup**: ~500MB download
- **Regular usage**: ~10-50MB per hour
- **AI interactions**: ~1-10MB per conversation

## Compatibility Testing

### Verify Your System
Run this command to check system compatibility:

```bash
# Download and run compatibility check
curl -sSf https://morphbox.iu.dev/check-system.sh | bash
```

### Manual Verification

#### Check Docker
```bash
# Verify Docker installation
docker run --rm hello-world

# Check Docker Compose
docker-compose version

# Test container networking
docker run --rm alpine ping -c 1 google.com
```

#### Check System Resources
```bash
# Check available memory
free -m

# Check CPU cores
nproc

# Check disk space
df -h /

# Check Docker disk usage
docker system df
```

#### Check Permissions
```bash
# Verify Docker permissions
docker ps

# Check user groups
groups $USER

# Test sudo access (if needed)
sudo echo "Sudo works"
```

## Troubleshooting Requirements

### Common Issues

#### Insufficient Memory
```bash
# Symptoms: Container crashes, slow performance
# Solution: Close other applications or add more RAM

# Check memory usage
docker stats

# Restart with lower memory limit
docker run --memory="2g" morphbox
```

#### Docker Permission Denied
```bash
# Add user to docker group
sudo usermod -aG docker $USER

# Log out and back in, or run:
newgrp docker
```

#### Port Conflicts
```bash
# Check what's using port 8008
sudo lsof -i :8008

# Use different port
export MORPHBOX_PORT=8009
./morphbox-start
```

#### Virtualization Disabled
```bash
# Linux: Check virtualization support
egrep -c '(vmx|svm)' /proc/cpuinfo

# Enable in BIOS if needed
# Look for "Intel VT-x" or "AMD-V" in BIOS settings
```

### Performance Tuning

#### Docker Configuration
```bash
# Increase Docker memory limit
# Edit Docker Desktop preferences or daemon.json
{
  "memory": "8192m",
  "cpus": "4"
}
```

#### System Optimization
```bash
# Linux: Increase file watchers
echo 'fs.inotify.max_user_watches=524288' | sudo tee -a /etc/sysctl.conf

# Increase swap if needed
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

## Cloud and Virtual Environments

### AWS EC2
- **Instance Type**: t3.medium or larger
- **Storage**: 20GB+ EBS volume
- **Security Groups**: Allow ports 8008, 22

### Google Cloud
- **Machine Type**: e2-standard-2 or larger
- **Boot Disk**: 20GB+ SSD
- **Firewall**: Allow tcp:8008

### Azure VM
- **Size**: Standard_B2s or larger
- **Disk**: 30GB+ Premium SSD
- **Network**: Allow port 8008

### Docker in Docker
MorphBox supports running inside existing Docker containers:
```bash
# Run with Docker socket mounted
docker run -v /var/run/docker.sock:/var/run/docker.sock morphbox
```

## Next Steps

Once you've verified system requirements:

1. **[Install MorphBox](/docs/getting-started/installation)** - Follow the installation guide
2. **[Quick Start](/docs/getting-started/quick-start)** - Get up and running quickly
3. **[Troubleshooting](/docs/support/troubleshooting)** - If you encounter issues
4. **[Performance Tuning](/docs/features/performance)** - Optimize for your workload