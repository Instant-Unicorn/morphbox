---
title: Troubleshooting Guide
description: Solutions to common MorphBox issues and problems
lastModified: 2024-12-19
---

# Troubleshooting Guide

This guide covers common issues you might encounter while using MorphBox and their solutions.

## Quick Diagnostics

Before diving into specific issues, run these diagnostic commands:

```bash
# Check overall system status
./scripts/vm-manager.sh status

# Check Docker and containers
docker ps -a

# Check logs
tail -f web.log websocket.log

# Check disk space
docker system df
```

## Installation Issues

### Docker Not Found
**Symptoms**: `command not found: docker`

**Solutions**:
```bash
# Ubuntu/Debian
sudo apt update && sudo apt install docker.io docker-compose

# CentOS/RHEL/Fedora
sudo dnf install docker docker-compose

# macOS
brew install --cask docker

# Start Docker service (Linux)
sudo systemctl start docker
sudo systemctl enable docker
```

### Permission Denied Errors
**Symptoms**: `permission denied while trying to connect to Docker daemon`

**Solutions**:
```bash
# Add user to docker group
sudo usermod -aG docker $USER

# Apply group changes
newgrp docker

# Or log out and back in

# Verify permissions
docker run --rm hello-world
```

### Port Already in Use
**Symptoms**: `bind: address already in use`

**Solutions**:
```bash
# Find what's using the port
sudo lsof -i :8008

# Kill the process
sudo kill -9 <PID>

# Or use a different port
export MORPHBOX_PORT=8009
./morphbox-start

# Or use --dev flag with different port
./morphbox-start --external --dev
```

### Insufficient Disk Space
**Symptoms**: `no space left on device`

**Solutions**:
```bash
# Check disk usage
df -h

# Clean Docker system
docker system prune -a

# Remove unused volumes
docker volume prune

# Check MorphBox disk usage
docker system df
```

## Container Issues

### Container Won't Start
**Symptoms**: Container exits immediately or won't start

**Diagnostic Steps**:
```bash
# Check container status
docker ps -a

# View container logs
docker logs morphbox-vm

# Check for errors
./scripts/vm-manager.sh logs
```

**Solutions**:
```bash
# Restart the container
./scripts/vm-manager.sh restart

# Rebuild if needed
./scripts/vm-manager.sh remove
./morphbox-start

# Check system resources
free -h
docker stats
```

### SSH Connection Failed
**Symptoms**: Cannot connect to container via SSH

**Diagnostic Steps**:
```bash
# Check if container is running
docker ps | grep morphbox-vm

# Check SSH service in container
docker exec morphbox-vm systemctl status ssh

# Test SSH connection
ssh -p 2222 morphbox@localhost echo "SSH works"
```

**Solutions**:
```bash
# Restart SSH service
docker exec morphbox-vm systemctl restart ssh

# Check SSH configuration
docker exec morphbox-vm cat /etc/ssh/sshd_config

# Restart container
./scripts/vm-manager.sh restart

# Check for port conflicts
sudo lsof -i :2222
```

### Container Keeps Restarting
**Symptoms**: Container in restart loop

**Diagnostic Steps**:
```bash
# Check restart count
docker ps -a

# View recent logs
docker logs --tail 50 morphbox-vm

# Check system resources
docker stats morphbox-vm
```

**Solutions**:
```bash
# Check memory limits
docker inspect morphbox-vm | grep -i memory

# Increase memory allocation
# Edit docker-compose.yml to add:
# mem_limit: 4g

# Check for hardware issues
dmesg | grep -i error

# Reset container
./scripts/vm-manager.sh remove
./morphbox-start
```

## Authentication Issues

### Claude Authentication Failed
**Symptoms**: Cannot authenticate with Claude

**Diagnostic Steps**:
```bash
# Check authentication status
./scripts/vm-manager.sh check-auth

# Test Claude CLI
docker exec morphbox-vm claude --version

# Check network connectivity
docker exec morphbox-vm ping api.anthropic.com
```

**Solutions**:
```bash
# Reset authentication
./scripts/vm-manager.sh reset-auth

# Re-authenticate
./scripts/vm-manager.sh login
# Then in container: claude auth login

# Check API key if using environment variables
docker exec morphbox-vm env | grep ANTHROPIC

# Verify network access
curl -s https://api.anthropic.com/v1/health
```

### Authentication Not Persisting
**Symptoms**: Need to re-authenticate every restart

**Diagnostic Steps**:
```bash
# Check Docker volumes
docker volume ls | grep morphbox

# Check volume mounting
docker inspect morphbox-vm | grep -A 10 Mounts

# Check config directory
docker exec morphbox-vm ls -la /home/morphbox/.config/claude-code
```

**Solutions**:
```bash
# Verify volume persistence
docker volume inspect morphbox_claude-config

# Recreate volumes if needed
docker volume rm morphbox_claude-config
./scripts/vm-manager.sh start

# Check file permissions
docker exec morphbox-vm chown -R morphbox:morphbox /home/morphbox/.config
```

## Web Interface Issues

### Can't Access Web Interface
**Symptoms**: Browser can't connect to http://localhost:8008

**Diagnostic Steps**:
```bash
# Check if web server is running
ps aux | grep node

# Check port binding
sudo netstat -tlnp | grep 8008

# Check web logs
tail -f web.log
```

**Solutions**:
```bash
# Restart web server
pkill -f "vite dev"
./morphbox-start

# Check firewall
sudo ufw status
sudo ufw allow 8008/tcp

# Try different port
export MORPHBOX_PORT=8009
./morphbox-start

# Check browser console for errors
# F12 -> Console tab
```

### WebSocket Connection Failed
**Symptoms**: Terminal not responding, connection errors

**Diagnostic Steps**:
```bash
# Check WebSocket server
ps aux | grep websocket

# Check WebSocket logs
tail -f websocket.log

# Test WebSocket connection
curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" http://localhost:8009
```

**Solutions**:
```bash
# Restart WebSocket server
pkill -f "websocket-server"
./morphbox-start

# Check port availability
sudo lsof -i :8009

# Verify network configuration
docker network ls
docker network inspect bridge
```

### Panels Not Loading
**Symptoms**: Panels appear empty or fail to load

**Diagnostic Steps**:
```bash
# Check browser console
# F12 -> Console -> Look for JavaScript errors

# Check API endpoints
curl http://localhost:8008/api/panels

# Check file permissions
ls -la web/src/lib/panels/
```

**Solutions**:
```bash
# Clear browser cache
# Ctrl+F5 or Ctrl+Shift+R

# Restart web server
./morphbox-start

# Check for missing dependencies
cd web && npm install

# Verify panel registry
curl http://localhost:8008/api/panels/list
```

## Terminal and Session Issues

### Terminal Not Responding
**Symptoms**: Terminal input not working

**Diagnostic Steps**:
```bash
# Check SSH connection
./scripts/vm-manager.sh connect

# Check tmux sessions
./scripts/vm-manager.sh sessions

# Test direct SSH
ssh -p 2222 morphbox@localhost
```

**Solutions**:
```bash
# Restart SSH connection
./scripts/vm-manager.sh restart

# Kill hung sessions
./scripts/vm-manager.sh kill-sessions

# Create new session
./scripts/vm-manager.sh connect
```

### Lost Terminal Session
**Symptoms**: Cannot reconnect to previous session

**Diagnostic Steps**:
```bash
# List active sessions
./scripts/vm-manager.sh sessions

# Check tmux status
docker exec morphbox-vm tmux list-sessions

# Check user processes
docker exec morphbox-vm ps aux | grep morphbox
```

**Solutions**:
```bash
# Try to reattach
docker exec -it morphbox-vm tmux attach -t morphbox-claude

# Create new session if needed
./scripts/vm-manager.sh connect

# Check session persistence
docker exec morphbox-vm ls -la /home/morphbox/.tmux*
```

### Command History Lost
**Symptoms**: Bash history not preserved

**Diagnostic Steps**:
```bash
# Check history file
docker exec morphbox-vm ls -la /home/morphbox/.bash_history

# Check volume mounting
docker inspect morphbox-vm | grep -A 5 claude-home

# Test history writing
docker exec morphbox-vm bash -c "history -w; ls -la ~/.bash_history"
```

**Solutions**:
```bash
# Ensure proper volume mounting
docker volume inspect morphbox_claude-home

# Fix permissions
docker exec morphbox-vm chown morphbox:morphbox /home/morphbox/.bash_history

# Force history write
# In terminal: history -w
```

## Performance Issues

### High CPU Usage
**Symptoms**: System sluggish, high CPU in task manager

**Diagnostic Steps**:
```bash
# Check Docker stats
docker stats

# Check process usage
docker exec morphbox-vm top

# Check host system
top
htop
```

**Solutions**:
```bash
# Limit CPU usage in docker-compose.yml
cpus: "2.0"

# Restart services
./scripts/vm-manager.sh restart

# Check for runaway processes
docker exec morphbox-vm ps aux --sort=-%cpu
```

### High Memory Usage
**Symptoms**: System running out of memory

**Diagnostic Steps**:
```bash
# Check memory usage
free -h
docker stats

# Check container memory
docker exec morphbox-vm free -h

# Check for memory leaks
docker exec morphbox-vm ps aux --sort=-%mem
```

**Solutions**:
```bash
# Set memory limits in docker-compose.yml
mem_limit: 4g

# Restart container
./scripts/vm-manager.sh restart

# Clear caches
docker exec morphbox-vm sync && echo 3 > /proc/sys/vm/drop_caches
```

### Slow File Operations
**Symptoms**: File operations take a long time

**Diagnostic Steps**:
```bash
# Check disk I/O
docker exec morphbox-vm iostat 1 5

# Check mount performance
docker exec morphbox-vm mount | grep workspace

# Test file operations
time docker exec morphbox-vm ls -la /workspace
```

**Solutions**:
```bash
# Use bind mounts instead of volumes for workspace
# Edit docker-compose.yml:
# - ./workspace:/workspace:cached

# Check host disk performance
sudo iotop

# Ensure SSD is being used
lsblk
```

## Network Issues

### External Access Not Working
**Symptoms**: Cannot access MorphBox from other devices

**Diagnostic Steps**:
```bash
# Check binding
sudo netstat -tlnp | grep 8008

# Check firewall
sudo ufw status

# Test from another device
curl -I http://YOUR_IP:8008
```

**Solutions**:
```bash
# Ensure external binding
./morphbox-start --external

# Open firewall ports
sudo ufw allow 8008/tcp

# Check network interface
ip addr show

# Disable firewall temporarily for testing
sudo ufw disable
```

### DNS Resolution Issues
**Symptoms**: Cannot reach external services

**Diagnostic Steps**:
```bash
# Test DNS resolution
docker exec morphbox-vm nslookup google.com

# Check DNS configuration
docker exec morphbox-vm cat /etc/resolv.conf

# Test connectivity
docker exec morphbox-vm ping -c 4 8.8.8.8
```

**Solutions**:
```bash
# Update DNS in container
docker exec morphbox-vm bash -c "echo 'nameserver 8.8.8.8' > /etc/resolv.conf"

# Restart networking
./scripts/vm-manager.sh restart

# Check host DNS
systemd-resolve --status
```

## Data and File Issues

### Files Not Persisting
**Symptoms**: Files disappear after restart

**Diagnostic Steps**:
```bash
# Check volume mounting
docker inspect morphbox-vm | grep -A 10 Mounts

# Check workspace directory
ls -la workspace/

# Test file creation
docker exec morphbox-vm touch /workspace/test-file
ls -la workspace/test-file
```

**Solutions**:
```bash
# Ensure proper volume mounting
# Check docker-compose.yml volumes section

# Fix permissions
sudo chown -R $USER:$USER workspace/

# Recreate volumes if needed
./scripts/vm-manager.sh remove
./morphbox-start
```

### Permission Denied on Files
**Symptoms**: Cannot create or modify files

**Diagnostic Steps**:
```bash
# Check file permissions
ls -la workspace/

# Check user in container
docker exec morphbox-vm id

# Test file creation
docker exec morphbox-vm touch /workspace/test-write
```

**Solutions**:
```bash
# Fix workspace permissions
sudo chown -R $USER:$USER workspace/

# Fix container user permissions
docker exec morphbox-vm chown -R morphbox:morphbox /workspace

# Use proper user in container
docker exec -u morphbox morphbox-vm bash
```

## Getting Additional Help

### Collecting Debug Information
When reporting issues, include:

```bash
# System information
uname -a
docker --version
./scripts/vm-manager.sh status

# Container logs
docker logs morphbox-vm --tail 100

# Recent application logs
tail -n 50 web.log websocket.log

# System resources
free -h
df -h
docker system df
```

### Where to Get Help

1. **Documentation**: Check other sections of this documentation
2. **GitHub Issues**: [Report bugs](https://github.com/morphbox/morphbox/issues)
3. **Discussions**: [Community discussions](https://github.com/morphbox/morphbox/discussions)
4. **FAQ**: [Frequently Asked Questions](/docs/support/faq)

### Creating Good Bug Reports

Include:
- **Environment**: OS, Docker version, MorphBox version
- **Steps to reproduce**: Exact commands and actions
- **Expected behavior**: What should happen
- **Actual behavior**: What actually happens
- **Logs**: Relevant log output
- **Screenshots**: If UI-related

### Emergency Recovery

If MorphBox is completely broken:

```bash
# Stop everything
docker stop $(docker ps -q)

# Remove containers (keeps volumes)
docker rm morphbox-vm

# Clean up
docker system prune

# Reinstall
git pull origin main
./morphbox-start

# Restore authentication
./scripts/vm-manager.sh login
```

This will preserve your data while fixing most issues.