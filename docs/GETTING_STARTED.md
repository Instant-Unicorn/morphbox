# Getting Started with MorphBox

Welcome to MorphBox! This guide will walk you through everything you need to get up and running with your secure AI development environment.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installation](#installation)
3. [First Launch](#first-launch)
4. [Understanding the Interface](#understanding-the-interface)
5. [Your First Session](#your-first-session)
6. [Next Steps](#next-steps)

## Prerequisites

Before installing MorphBox, ensure you have the following:

### Required Software

#### 1. Docker
MorphBox runs in Docker containers for isolation and security.

**Check if Docker is installed:**
```bash
docker --version
```

**Install Docker if needed:**
- **macOS/Windows**: Download [Docker Desktop](https://www.docker.com/products/docker-desktop)
- **Linux**: 
  ```bash
  curl -fsSL https://get.docker.com | sh
  sudo usermod -aG docker $USER
  # Log out and back in for group changes to take effect
  ```

**Verify Docker is running:**
```bash
docker ps
```
If you see a table (even if empty), Docker is running correctly.

#### 2. Node.js (for npm installation)
**Check if Node.js is installed:**
```bash
node --version
npm --version
```

**Install Node.js if needed:**
- Download from [nodejs.org](https://nodejs.org/) (LTS version recommended)
- Or use a version manager like [nvm](https://github.com/nvm-sh/nvm):
  ```bash
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
  nvm install --lts
  ```

### System Requirements

- **Memory**: Minimum 4GB RAM (8GB recommended)
- **Storage**: 10GB free disk space
- **Network**: Internet connection for initial setup

### Quick Prerequisites Check

Run this script to check all prerequisites:

```bash
#!/bin/bash
echo "Checking MorphBox prerequisites..."
echo ""

# Check Docker
if command -v docker &> /dev/null; then
    echo "✅ Docker installed: $(docker --version)"
    if docker ps &> /dev/null; then
        echo "✅ Docker is running"
    else
        echo "❌ Docker is not running. Please start Docker Desktop."
    fi
else
    echo "❌ Docker not found. Please install Docker."
fi

# Check Node.js
if command -v node &> /dev/null; then
    echo "✅ Node.js installed: $(node --version)"
else
    echo "❌ Node.js not found. Please install Node.js."
fi

# Check npm
if command -v npm &> /dev/null; then
    echo "✅ npm installed: $(npm --version)"
else
    echo "❌ npm not found. Please install Node.js/npm."
fi

# Check disk space
AVAILABLE=$(df -h . | awk 'NR==2 {print $4}')
echo "📊 Available disk space: $AVAILABLE"
```

## Installation

### Option 1: Global Installation (Recommended)

Install MorphBox globally to use it from anywhere:

```bash
npm install -g morphbox
```

**Verify installation:**
```bash
morphbox --version
```

**Troubleshooting npm global installation:**

If you get "command not found" after installation:

1. Find your npm global bin directory:
   ```bash
   npm config get prefix
   ```

2. Add it to your PATH:
   ```bash
   # For bash (add to ~/.bashrc)
   export PATH="$(npm config get prefix)/bin:$PATH"
   
   # For zsh (add to ~/.zshrc)
   export PATH="$(npm config get prefix)/bin:$PATH"
   
   # Reload your shell configuration
   source ~/.bashrc  # or source ~/.zshrc
   ```

### Option 2: Use Without Installation (npx)

If you prefer not to install globally:

```bash
npx morphbox
```

This downloads and runs MorphBox on demand.

### Option 3: Install from Source

For developers or contributors:

```bash
# Clone the repository
git clone https://github.com/MicahBly/morphbox.git
cd morphbox/web

# Install dependencies
npm install

# Link globally (optional)
npm link

# Run directly
npm run start
```

## First Launch

### Starting MorphBox

1. **Navigate to your project directory:**
   ```bash
   cd ~/my-project
   ```

2. **Start MorphBox:**
   ```bash
   morphbox
   ```

3. **What happens on first launch:**
   - Docker image download (one-time, ~500MB)
   - Container creation
   - Service initialization
   - Web interface starts

   First launch takes 2-3 minutes. Subsequent launches take <30 seconds.

### First Launch Output

You'll see output like this:

```
[INFO] Checking Docker container...
[INFO] Creating MorphBox VM container with workspace: /home/user/my-project
[INFO] Building Docker image... (this may take a few minutes on first run)
[INFO] Container created successfully
[INFO] Starting web interface...
[INFO] 
[INFO] ✨ MorphBox is ready!
[INFO] 
[INFO] 🌐 Web Interface: http://localhost:3000
[INFO] 📁 Workspace: /home/user/my-project mounted as /workspace
[INFO] 
[INFO] Press Ctrl+C to stop MorphBox
```

## Understanding the Interface

### Web Interface (Default)

Open your browser to `http://localhost:3000`. You'll see:

1. **Terminal Panel** (Left)
   - Full bash terminal
   - Access to `/workspace` (your mounted directory)
   - All development tools available

2. **Claude Panel** (Right)
   - AI assistant interface
   - Code-aware context
   - Markdown rendering for responses

3. **Toolbar** (Top)
   - New Terminal button
   - Layout options
   - Settings

### Terminal Mode

For a pure terminal experience:

```bash
morphbox --terminal
```

This launches Claude directly in your terminal - perfect for users who prefer CLI.

### Key Concepts

- **Workspace**: Your current directory is mounted as `/workspace` in the container
- **Isolation**: The container cannot access files outside the mounted workspace
- **Persistence**: Claude's configuration and your work persist between sessions
- **Security**: Network access is restricted to allowed domains only

## Your First Session

Let's create a simple project with Claude's help:

### Example 1: Create a Python Script

1. **Start MorphBox in a new directory:**
   ```bash
   mkdir my-first-morphbox
   cd my-first-morphbox
   morphbox
   ```

2. **In the Claude panel, type:**
   ```
   Help me create a Python script that fetches weather data from an API
   and displays it nicely formatted
   ```

3. **Claude will:**
   - Write the Python code
   - Explain how it works
   - Suggest how to run it

4. **In the terminal panel:**
   ```bash
   # See the created file
   ls -la
   
   # Run the script
   python weather.py
   ```

### Example 2: Web Development

1. **Ask Claude:**
   ```
   Create a simple responsive landing page with HTML, CSS, and JavaScript
   that has a dark mode toggle
   ```

2. **Claude will create:**
   - `index.html`
   - `styles.css`
   - `script.js`

3. **Preview your work:**
   ```bash
   # In the terminal panel
   python -m http.server 8000
   ```
   Then open `http://localhost:8000` in a new browser tab.

### Example 3: Learning Mode

Ask Claude to teach you:
```
Explain Docker to me with examples, then help me create my first Dockerfile
```

Claude will:
- Provide conceptual explanation
- Show practical examples
- Guide you through creating a Dockerfile
- Help you build and run it

## Common Commands

### MorphBox Commands

```bash
morphbox              # Start with web UI
morphbox --terminal   # Terminal mode
morphbox --vpn        # Bind to VPN interface
morphbox --auth       # Enable authentication
morphbox --help       # Show all options
```

### Inside the Container

```bash
# Navigation
cd /workspace         # Your mounted directory
ls -la               # List files

# Development
node app.js          # Run Node.js apps
python script.py     # Run Python scripts
npm install          # Install packages

# Claude specific
claude --help        # Claude CLI options
```

## Configuration

### Basic Configuration

Create `.morphbox.env` in your project:

```env
# Change the web interface port
MORPHBOX_PORT=8080

# Enable authentication
MORPHBOX_AUTH_ENABLED=true
MORPHBOX_AUTH_USERNAME=myusername
```

### Advanced Configuration

See [Configuration Reference](CONFIGURATION.md) for all options.

## Troubleshooting First-Time Issues

### Issue: "Docker daemon not running"

**Solution:**
```bash
# macOS/Windows: Start Docker Desktop application
# Linux:
sudo systemctl start docker
```

### Issue: "Port 3000 already in use"

**Solution:**
```bash
# Use a different port
MORPHBOX_PORT=8080 morphbox
```

### Issue: "Permission denied"

**Solution:**
```bash
# Linux: Add user to docker group
sudo usermod -aG docker $USER
# Log out and back in
```

### Issue: "Container fails to start"

**Solution:**
```bash
# Remove any existing container
docker rm -f morphbox-vm

# Try again
morphbox
```

## Next Steps

Now that you have MorphBox running:

1. **Read the Tutorials** - [docs/TUTORIALS.md](TUTORIALS.md)
   - Build a full-stack application
   - Learn test-driven development
   - Create API endpoints

2. **Explore Use Cases** - [docs/USE_CASES.md](USE_CASES.md)
   - Code reviews
   - Learning new languages
   - Debugging assistance

3. **Customize Your Environment** - [docs/CONFIGURATION.md](CONFIGURATION.md)
   - Add your favorite tools
   - Configure shortcuts
   - Set up team access

4. **Join the Community**
   - [GitHub Discussions](https://github.com/MicahBly/morphbox/discussions)
   - Report issues
   - Share your projects

## Getting Help

- **Documentation**: [Full documentation](../README.md#-documentation)
- **Issues**: [GitHub Issues](https://github.com/MicahBly/morphbox/issues)
- **Quick Help**: Run `morphbox --help`

## Tips for Success

1. **Start Simple**: Begin with small tasks to understand the workflow
2. **Be Specific**: Give Claude clear, detailed instructions
3. **Iterate**: Refine your requests based on Claude's responses
4. **Explore**: Try different types of projects and languages
5. **Save Your Work**: Remember to commit changes to git

---

**Ready to build something amazing?** You now have a powerful AI assistant in a secure sandbox. Happy coding! 🚀