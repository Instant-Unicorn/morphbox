---
title: Claude Authentication Setup
description: Configure persistent Claude authentication and terminal sessions
lastModified: 2024-12-19
---

# Claude Authentication & Terminal Persistence

MorphBox includes persistent Claude authentication AND terminal session persistence to maintain your work environment between connections.

## How It Works

MorphBox uses Docker volumes and tmux sessions to provide:
- **Persistent Authentication**: Claude login credentials stored in Docker volumes
- **Persistent Terminal Sessions**: Your terminal sessions survive disconnections/reconnections  
- **Persistent Workspace**: Your files and command history are preserved

## First Time Setup

### 1. Start MorphBox
This will create the VM automatically:
```bash
./morphbox-start
```

### 2. Authenticate with Claude
One-time setup:
```bash
./scripts/vm-manager.sh login
```

This opens a persistent tmux session. Once connected, run:
```bash
claude auth login
```

Follow the authentication prompts. After authentication, you can:
- **Detach** with `Ctrl+B` then `D` (keeps session running)
- **Exit completely** with `exit`

### 3. Verify Authentication
```bash
./scripts/vm-manager.sh check-auth
```

## Daily Usage

Once set up, you can connect to your persistent terminal:

```bash
./scripts/vm-manager.sh connect
```

Your terminal session will:
- ✅ Remember your command history
- ✅ Preserve running processes  
- ✅ Keep your current directory
- ✅ Maintain Claude authentication
- ✅ Restore your work environment

## VM Management Commands

The `vm-manager.sh` script provides several useful commands:

### Basic Commands
- `./scripts/vm-manager.sh start` - Start the MorphBox VM
- `./scripts/vm-manager.sh stop` - Stop the MorphBox VM  
- `./scripts/vm-manager.sh restart` - Restart the MorphBox VM
- `./scripts/vm-manager.sh status` - Show VM and authentication status

### Authentication Commands
- `./scripts/vm-manager.sh login` - Open interactive session for Claude login
- `./scripts/vm-manager.sh check-auth` - Check if Claude is authenticated
- `./scripts/vm-manager.sh reset-auth` - Clear stored authentication (forces re-login)

### Terminal Session Commands
- `./scripts/vm-manager.sh connect` - Connect to your persistent terminal session
- `./scripts/vm-manager.sh sessions` - List active terminal sessions
- `./scripts/vm-manager.sh kill-sessions` - Kill all sessions (⚠️ loses unsaved work)

### Maintenance Commands
- `./scripts/vm-manager.sh logs` - Show container logs
- `./scripts/vm-manager.sh logs -f` - Follow container logs
- `./scripts/vm-manager.sh remove` - Remove container (⚠️ loses authentication!)

## Persistence Details

MorphBox provides comprehensive persistence through Docker volumes and tmux:

### Docker Volumes
- **claude-config**: Stores `~/.config/claude-code` directory (authentication)
- **claude-home**: Stores the entire home directory (bash history, tmux sessions)

### Tmux Sessions
- **Session Name**: `morphbox-claude` (automatic)
- **Features**: Mouse support, scrollback history, status bar
- **Persistence**: Sessions survive SSH disconnections

### What Persists
- ✅ Claude authentication tokens
- ✅ Command history across sessions
- ✅ Running processes (if detached properly)
- ✅ Current working directory
- ✅ Environment variables
- ✅ Open files and editors

### What Doesn't Persist
- ❌ Unsaved changes in editors (save your work!)
- ❌ Processes if you `exit` instead of detaching

## Troubleshooting

### Authentication Lost
If you lose authentication, simply run:
```bash
./scripts/vm-manager.sh login
```

### Container Issues
If the container has problems, you can reset it:
```bash
./scripts/vm-manager.sh remove
./scripts/vm-manager.sh start
./scripts/vm-manager.sh login
```

### Check Status
Always check the status first when troubleshooting:
```bash
./scripts/vm-manager.sh status
```

## Security Notes

- The VM runs with SSH on port 2222 (localhost only by default)
- Authentication data is stored in local Docker volumes
- The VM is isolated from your host system
- Default SSH credentials are `morphbox:morphbox` (only accessible from localhost)

## Manual SSH Access

If needed, you can manually SSH into the container:
```bash
ssh -p 2222 morphbox@localhost
# Password: morphbox
```

## Environment Variables

You can customize VM connection settings:
- `MORPHBOX_VM_HOST` - VM hostname (default: 127.0.0.1)
- `MORPHBOX_VM_PORT` - SSH port (default: 2222)  
- `MORPHBOX_VM_USER` - SSH username (default: morphbox)

## Tmux Quick Reference

When connected to your persistent session, these commands are useful:

### Session Management
- `Ctrl+B` then `D` - **Detach** from session (keeps running)
- `Ctrl+B` then `?` - Show help/key bindings
- `exit` - Exit session completely

### Window Management
- `Ctrl+B` then `C` - Create new window
- `Ctrl+B` then `N` - Next window
- `Ctrl+B` then `P` - Previous window
- `Ctrl+B` then `0-9` - Switch to window number

### Pane Management
- `Ctrl+B` then `%` - Split pane vertically
- `Ctrl+B` then `"` - Split pane horizontally
- `Ctrl+B` then arrow keys - Navigate between panes

### Copy Mode (scrollback)
- `Ctrl+B` then `[` - Enter copy mode (use arrow keys to scroll)
- `q` - Exit copy mode

### Pro Tips
- Mouse scrolling works in tmux (enabled by default)
- Command history persists across reconnections
- Your session will show `[MorphBox]` in the status bar
- Always **detach** (`Ctrl+B` then `D`) instead of `exit` to preserve your work

## Advanced Usage

### Multiple Windows
Create different windows for different projects:
```bash
# In tmux session:
Ctrl+B then C    # Create new window
Ctrl+B then ,    # Rename current window
```

### Session Sharing
Share your session with team members:
```bash
# Connect multiple users to same session
./scripts/vm-manager.sh connect
```

### Backup and Restore
```bash
# Backup your configuration
docker cp morphbox-vm:/home/morphbox/.config ./backup-config

# Restore configuration (after container recreation)
docker cp ./backup-config morphbox-vm:/home/morphbox/.config
```

## Next Steps

- [Learn about terminal persistence](/docs/user-guide/terminal-persistence)
- [Explore the panel system](/docs/user-guide/panels)
- [Configure external access](/docs/user-guide/external-access)
- [API reference for developers](/docs/api)