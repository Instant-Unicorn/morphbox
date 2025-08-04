#!/bin/bash
# Docker entrypoint script for MorphBox
# Handles Claude auto-updates and starts SSH daemon

set -e

# Function to check if Claude needs updating
check_and_update_claude() {
    echo "🔄 Checking for Claude updates..."
    
    # Get current version if Claude is installed
    if command -v claude >/dev/null 2>&1; then
        CURRENT_VERSION=$(claude --version 2>/dev/null | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' || echo "0.0.0")
        echo "📌 Current Claude version: $CURRENT_VERSION"
    else
        echo "⚠️  Claude not found, installing..."
        CURRENT_VERSION="0.0.0"
    fi
    
    # Try to update Claude as morphbox user
    echo "🚀 Updating Claude to latest version..."
    sudo -u morphbox npm update -g @anthropic-ai/claude-code 2>&1 | tee /tmp/claude-update.log
    
    # Check if update was successful
    if [ $? -eq 0 ]; then
        NEW_VERSION=$(sudo -u morphbox claude --version 2>/dev/null | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' || echo "unknown")
        if [ "$NEW_VERSION" != "$CURRENT_VERSION" ] && [ "$NEW_VERSION" != "unknown" ]; then
            echo "✅ Claude updated from $CURRENT_VERSION to $NEW_VERSION"
        else
            echo "✅ Claude is already up to date (version: $NEW_VERSION)"
        fi
    else
        echo "⚠️  Claude update failed. Check /tmp/claude-update.log for details"
    fi
    
    # Ensure proper permissions on npm directories
    chown -R morphbox:morphbox /usr/local/lib/node_modules /usr/local/bin /usr/local/share 2>/dev/null || true
}

# Run Claude update check
check_and_update_claude

# Create restricted Claude wrapper
echo "🔧 Setting up Claude wrapper for directory restriction..."
cat > /usr/local/bin/claude-restricted << 'EOF'
#!/bin/bash
# Restricted Claude wrapper that prevents directory traversal above /workspace

# Ensure we start in /workspace if possible
if [ -d "/workspace" ]; then
    cd /workspace 2>/dev/null || true
fi

# Override cd command to prevent going above /workspace
cd() {
    if [ $# -eq 0 ]; then
        # No arguments, go to /workspace
        if [ -d "/workspace" ]; then
            builtin cd /workspace
        else
            echo "⚠️  /workspace not available, staying in current directory"
        fi
    else
        local target="$1"
        
        # Handle relative paths
        if [[ "$target" != /* ]]; then
            target="$(pwd)/$target"
        fi
        
        # Resolve path (handle .. and .)
        target=$(realpath -m "$target" 2>/dev/null || echo "$target")
        
        # Check if target is within /workspace
        if [[ "$target" =~ ^/workspace ]] || [[ "$target" == "/workspace" ]]; then
            if [ -d "$target" ]; then
                builtin cd "$target"
            else
                echo "Directory not found: $1"
                return 1
            fi
        else
            echo "⚠️  Access denied: Directory outside /workspace"
            echo "   Attempted: $1 -> $target"
            echo "   Staying in current directory: $(pwd)"
            return 1
        fi
    fi
}

# Export the cd function so child processes inherit it
export -f cd

# Show directory restriction message
echo "🔒 Directory access restricted to /workspace and subdirectories"
echo "📁 Current directory: $(pwd)"

# Run the original Claude command
exec /usr/local/bin/claude "$@"
EOF

chmod +x /usr/local/bin/claude-restricted

# Ensure /workspace exists and has proper permissions
mkdir -p /workspace
chown morphbox:morphbox /workspace

# Start SSH daemon
echo "🔐 Starting SSH daemon..."
exec /usr/sbin/sshd -D