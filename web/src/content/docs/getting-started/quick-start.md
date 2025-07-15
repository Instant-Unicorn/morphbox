---
title: Quick Start Guide
description: Get up and running with MorphBox in 5 minutes
lastModified: 2024-12-19
---

# Quick Start Guide

Get MorphBox up and running in just a few minutes. This guide will walk you through the essential steps to start using MorphBox effectively.

## Step 1: Start MorphBox

After [installation](/docs/getting-started/installation), start MorphBox:

```bash
# Navigate to the MorphBox directory
cd morphbox

# Start MorphBox
./morphbox-start
```

You should see output like:
```
[INFO] Starting MorphBox VM...
[INFO] Starting WebSocket server...
[INFO] Starting MorphBox web interface...
[INFO] MorphBox is running!
- Web interface: http://localhost:8008
```

## Step 2: Access the Web Interface

Open your browser and go to **http://localhost:8008**

You'll see the MorphBox interface with:
- **Header**: Connection status and controls
- **Terminal Panel**: Your persistent terminal session
- **Status Bar**: System information and panel count

## Step 3: Authenticate with Claude

For the best experience, set up Claude authentication:

### Option A: Using the Web Interface
1. The terminal will show Claude authentication prompts automatically
2. Follow the on-screen instructions to log in

### Option B: Using VM Manager (Recommended)
```bash
# Open a new terminal and navigate to MorphBox directory
cd morphbox

# Start authentication process
./scripts/vm-manager.sh login

# In the SSH session, run:
claude auth login

# Follow the prompts, then detach with Ctrl+B then D
```

## Step 4: Explore the Interface

### Terminal Panel
- **Persistent sessions**: Your terminal survives disconnections
- **Command history**: Previous commands are preserved
- **Claude integration**: Run `claude` to start the AI assistant

### Panel System
- **Panel Manager**: Click the grid icon (📊) in the header
- **Available panels**: Terminal, File Explorer, Code Editor, Settings
- **Add panels**: Use the Panel Manager to open additional tools

### Key Features to Try

#### 1. File Explorer
```bash
# Open Panel Manager and select "File Explorer"
# Or use the Files button in the header
```

- Browse your workspace files
- Create, edit, and delete files
- Navigate directory structure

#### 2. Code Editor
```bash
# Open a file from File Explorer
# Or create a new file and open it in the editor
```

- Syntax highlighting for multiple languages
- Auto-completion and error detection
- Integrated with file system

#### 3. Settings Panel
```bash
# Open Panel Manager and select "Settings"
```

- Configure themes (dark/light)
- Adjust terminal settings
- Customize keyboard shortcuts

## Step 5: Working with Persistent Sessions

### Understanding tmux
MorphBox uses tmux for session persistence:

- **Detach**: `Ctrl+B` then `D` (keeps session running)
- **Exit**: Type `exit` (terminates session)
- **Always detach** instead of exiting to preserve your work!

### Session Management
```bash
# Connect to your persistent session
./scripts/vm-manager.sh connect

# List active sessions
./scripts/vm-manager.sh sessions

# Check overall status
./scripts/vm-manager.sh status
```

## Step 6: Basic tmux Commands

Once connected to your terminal session:

### Window Management
- **New window**: `Ctrl+B` then `C`
- **Next window**: `Ctrl+B` then `N`
- **Previous window**: `Ctrl+B` then `P`
- **List windows**: `Ctrl+B` then `W`

### Pane Management
- **Split horizontally**: `Ctrl+B` then `"`
- **Split vertically**: `Ctrl+B` then `%`
- **Navigate panes**: `Ctrl+B` then arrow keys
- **Close pane**: `Ctrl+B` then `X`

### Session Management
- **Detach session**: `Ctrl+B` then `D`
- **List sessions**: `tmux list-sessions`

## Step 7: Working with Claude

### Starting Claude
```bash
# In the terminal, simply run:
claude

# Or for specific tasks:
claude chat
claude edit filename.py
claude analyze project/
```

### Claude Commands
- **Interactive chat**: `claude`
- **Edit files**: `claude edit <filename>`
- **Analyze code**: `claude analyze <directory>`
- **Help**: `claude --help`

## Step 8: Development Workflow

### Typical Workflow
1. **Start MorphBox**: `./morphbox-start`
2. **Open panels**: File Explorer, Terminal, Code Editor
3. **Connect to persistent session**: Auto-connects or use VM manager
4. **Work with files**: Edit, run, test your code
5. **Use Claude**: Get AI assistance with development tasks
6. **Detach when done**: `Ctrl+B` then `D` to preserve session

### Best Practices
- **Always detach**: Use `Ctrl+B` + `D` instead of `exit`
- **Organize with windows**: Create separate tmux windows for different projects
- **Save frequently**: Your session persists, but save your files regularly
- **Use panels**: Take advantage of the multi-panel interface

## Step 9: External Access (Optional)

To access MorphBox from other devices on your network:

```bash
# Stop MorphBox first
Ctrl+C

# Start with external access
./morphbox-start --external

# Access from other devices at:
# http://YOUR_IP_ADDRESS:8008
```

⚠️ **Security Warning**: Only use external access on trusted networks.

## Common Tasks

### Creating a New Project
```bash
# Create project directory
mkdir my-project
cd my-project

# Initialize git repository
git init

# Create initial files
touch README.md
echo "# My Project" > README.md

# Open in code editor (via File Explorer)
```

### Running Code
```bash
# Python
python3 script.py

# Node.js
node app.js

# General
./my-script.sh
```

### Managing Files
```bash
# List files
ls -la

# Create directories
mkdir src tests docs

# Copy files
cp source.txt destination.txt

# Move files
mv old-name.txt new-name.txt
```

## Troubleshooting Quick Fixes

### Terminal Not Responding
```bash
# Check VM status
./scripts/vm-manager.sh status

# Restart if needed
./scripts/vm-manager.sh restart
```

### Lost Session
```bash
# Connect to existing session
./scripts/vm-manager.sh connect

# If no session exists, start MorphBox again
./morphbox-start
```

### Authentication Issues
```bash
# Check Claude authentication
./scripts/vm-manager.sh check-auth

# Re-authenticate if needed
./scripts/vm-manager.sh login
```

### Port Conflicts
```bash
# Use different port
export MORPHBOX_PORT=8009
./morphbox-start
```

## Next Steps

Now that you're familiar with the basics:

1. **[Authentication Setup](/docs/user-guide/authentication)** - Learn about persistent authentication
2. **[Terminal Persistence](/docs/user-guide/terminal-persistence)** - Master session management
3. **[Panel System](/docs/user-guide/panels)** - Explore all available panels
4. **[API Reference](/docs/api)** - For advanced integrations
5. **[Features Overview](/docs/features)** - Discover all MorphBox capabilities

## Getting Help

- **Documentation**: Browse the [User Guide](/docs/user-guide)
- **Troubleshooting**: Check [common issues](/docs/support/troubleshooting)
- **Community**: Join our [community forums](/docs/support/community)
- **Issues**: Report bugs on [GitHub](https://github.com/morphbox/morphbox/issues)

Happy coding with MorphBox! 🚀