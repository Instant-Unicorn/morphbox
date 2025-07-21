---
title: Quick Start Guide
description: Get up and running with MorphBox in 5 minutes
lastModified: 2025-07-21
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
Starting MorphBox web interface...
MorphBox is running at http://localhost:3000
```

## Step 2: Access the Web Interface

Open your browser and go to **http://localhost:3000**

You'll see the MorphBox interface with:
- **Clean workspace**: Ready for your panels
- **Panel dropdown**: Top-right menu to add panels
- **Responsive layout**: Works on desktop and mobile

## Step 3: Create Your First Panel

### Using the Panel Dropdown

1. Click the **panel icon** (▼) in the top-right corner
2. Select a panel type:
   - **Terminal**: Interactive bash shell
   - **Claude**: AI assistant interface
   - **File Explorer**: Browse and manage files
   - **Code Editor**: Edit code with syntax highlighting
   - **Settings**: Customize MorphBox
   - **Session Manager**: View persistent sessions

### Understanding the Panel System

- **Grid Layout**: Panels arrange in a flexible grid
- **Resizable**: Drag panel edges to resize
- **Tabs**: Multiple panels can share the same space
- **Mobile Friendly**: Automatically adapts to screen size

## Step 4: Working with Terminal

### Open a Terminal Panel

1. Click the panel dropdown → Select "Terminal"
2. A new terminal panel appears with a bash shell

### Key Terminal Features

- **Persistent Sessions**: Uses GNU Screen for session persistence
- **Auto-reconnect**: Sessions survive browser refreshes
- **Full bash shell**: All standard Linux commands available
- **Claude CLI**: Pre-installed and ready to use

### Terminal Commands

```bash
# Check your environment
pwd
ls -la

# Test persistence (your session ID will differ)
echo "Session ID: $MORPHBOX_SESSION_ID"

# Use Claude CLI
claude --version
```

## Step 5: Authenticate with Claude

To use Claude AI features:

```bash
# In any terminal panel
claude login

# Follow the authentication prompts
# Your login persists across sessions
```

## Step 6: File Management

### Open File Explorer

1. Panel dropdown → Select "File Explorer"
2. Browse your workspace files
3. Double-click files to open in Code Editor

### File Explorer Features

- **Tree view**: Navigate directory structure
- **Context menu**: Right-click for file operations
- **Target selection**: Choose where files open
- **Create/Delete/Rename**: Full file management

### Working with Files

```bash
# In terminal, create some files
mkdir my-project
cd my-project
echo "# My Project" > README.md
echo "console.log('Hello, MorphBox!');" > app.js
```

Then refresh File Explorer to see your new files!

## Step 7: Code Editing

### Open Code Editor

1. Double-click any file in File Explorer
2. Or Panel dropdown → Select "Code Editor"

### Editor Features

- **Monaco Editor**: Same engine as VS Code
- **Syntax highlighting**: For 50+ languages
- **IntelliSense**: Auto-completion and hints
- **Multiple tabs**: Work with several files
- **Keyboard shortcuts**: Full productivity

### Try It Out

1. Open the `app.js` file you created
2. Edit the code
3. Save with `Ctrl+S` (or `Cmd+S` on Mac)
4. Run it in terminal: `node app.js`

## Step 8: Custom Panels

### Create Your Own Panel

1. Panel dropdown → Select "Settings"
2. Navigate to "Custom Panels" section
3. Click "Create New Panel"

### Panel Builder Features

- **Visual builder**: No coding required
- **Templates**: Start from pre-built examples
- **Live preview**: See changes instantly
- **Component library**: Buttons, forms, displays
- **Save and share**: Export your panels

### Example: Create a Todo Panel

1. Choose "Form & Display" template
2. Add input field for tasks
3. Add button to submit
4. Add list to display tasks
5. Save as "My Todo List"

## Step 9: Session Persistence

### Understanding Persistence

MorphBox uses GNU Screen to maintain terminal sessions:

- Sessions continue running when you close the browser
- Reconnect to the same session when you return
- Multiple sessions can run simultaneously
- Session IDs stored in browser localStorage

### Check Your Sessions

1. Panel dropdown → Select "Session Manager"
2. View all active sessions
3. See session details: ID, status, last activity
4. Kill sessions you no longer need

### Test Persistence

1. Run a long command in terminal:
   ```bash
   # Start a counter
   for i in {1..1000}; do echo $i; sleep 1; done
   ```
2. Close your browser completely
3. Reopen MorphBox
4. Open a new Terminal panel
5. Your counter is still running!

## Step 10: Mobile Usage

### Accessing on Mobile

1. Find your computer's IP address:
   ```bash
   ip addr show | grep inet
   # or on Mac: ifconfig | grep inet
   ```

2. On your mobile device, navigate to:
   ```
   http://YOUR_IP_ADDRESS:3000
   ```

### Mobile Features

- **Responsive panels**: Automatically adjust to screen size
- **Touch gestures**: Swipe and tap navigation
- **Virtual keyboard**: Works with terminal
- **Session persistence**: Switch apps without losing work

## Keyboard Shortcuts

### Global Shortcuts

- **Ctrl+P**: Open panel dropdown
- **Ctrl+S**: Save in Code Editor
- **Ctrl+F**: Find in Code Editor
- **Esc**: Close dropdowns/menus

### Terminal Shortcuts

- **Ctrl+C**: Cancel current command
- **Ctrl+D**: Exit shell (use Screen detach instead!)
- **Ctrl+L**: Clear screen
- **Tab**: Auto-complete

### Screen Session Shortcuts

- **Ctrl+A, D**: Detach from session (recommended)
- **Ctrl+A, C**: Create new window
- **Ctrl+A, N**: Next window
- **Ctrl+A, P**: Previous window

## Tips for Success

### Best Practices

1. **Use Session Manager**: Monitor your active sessions
2. **Detach, don't exit**: Preserve your work
3. **Organize with panels**: Create task-specific layouts
4. **Save layouts**: Settings → Save current layout
5. **Explore themes**: Try different color schemes

### Performance Tips

1. **Limit active panels**: Close unused panels
2. **Use tabs**: Group related panels
3. **Monitor sessions**: Clean up old sessions
4. **Browser choice**: Chrome/Edge perform best

## Common Tasks

### Web Development Setup

```bash
# Create project
mkdir my-app && cd my-app
npm init -y

# Install dependencies
npm install express

# Create server
cat > server.js << 'EOF'
const express = require('express');
const app = express();
app.get('/', (req, res) => res.send('Hello from MorphBox!'));
app.listen(3001, () => console.log('Server running on port 3001'));
EOF

# Run server
node server.js
```

### Python Development

```bash
# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install packages
pip install requests flask

# Create script
cat > app.py << 'EOF'
from flask import Flask
app = Flask(__name__)

@app.route('/')
def hello():
    return "Hello from MorphBox Flask app!"

if __name__ == '__main__':
    app.run(debug=True, port=5000)
EOF

# Run app
python app.py
```

### Using Claude for Development

```bash
# Get coding help
claude "How do I create a REST API in Node.js?"

# Code review
claude "Review this code for best practices" < server.js

# Debug assistance
claude "Why is my Flask app not starting?"
```

## Troubleshooting Quick Fixes

### Terminal Not Connecting

1. Check Session Manager for active sessions
2. Refresh the browser
3. Create a new Terminal panel

### Files Not Showing

1. Refresh File Explorer (click refresh icon)
2. Check you're in the right directory
3. Verify file permissions in terminal

### Panel Not Responding

1. Close and reopen the panel
2. Check browser console for errors (F12)
3. Refresh the page

### Session Lost

- Sessions persist in the container
- Check Session Manager
- Your work is likely still there!

## Next Steps

Now that you're familiar with the basics:

1. **[Panel System Guide](/docs/user-guide/panels)** - Master the panel system
2. **[Custom Panels](/docs/user-guide/custom-panels)** - Build your own tools
3. **[Terminal Sessions](/docs/user-guide/terminal-sessions)** - Advanced session management
4. **[Keyboard Shortcuts](/docs/user-guide/keyboard-shortcuts)** - Boost productivity
5. **[API Reference](/docs/api)** - Integrate with MorphBox

## Getting Help

- **Documentation**: Browse the [User Guide](/docs/user-guide)
- **Troubleshooting**: Check [common issues](/docs/support/troubleshooting)
- **Community**: Join our [community forums](/docs/support/community)
- **Issues**: Report bugs on [GitHub](https://github.com/morphbox/morphbox/issues)

Welcome to MorphBox - Happy coding! 🚀