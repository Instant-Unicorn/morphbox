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

# Check if user tries to go above /workspace
check_directory() {
    local current_dir=$(pwd)
    if [[ ! "$current_dir" =~ ^/workspace ]]; then
        echo "⚠️  Directory access restricted to /workspace and subdirectories"
        echo "   Current directory: $current_dir"
        echo "   Returning to /workspace..."
        cd /workspace
    fi
}

# Override cd command to prevent going above /workspace
cd() {
    if [ $# -eq 0 ]; then
        # No arguments, go to home directory within workspace
        builtin cd /workspace
    else
        local target="$1"
        
        # Get absolute path of target
        local abs_path
        if [[ "$target" == /* ]]; then
            abs_path="$target"
        else
            abs_path="$(builtin cd "$(dirname "$target")" && pwd)/$(basename "$target")"
        fi
        
        # Check if target is within /workspace
        if [[ "$abs_path" =~ ^/workspace ]]; then
            builtin cd "$target" 2>/dev/null || {
                echo "Directory not found: $target"
                return 1
            }
        else
            echo "⚠️  Access denied: Directory outside /workspace"
            echo "   Attempted: $target"
            echo "   Staying in current directory: $(pwd)"
            return 1
        fi
    fi
}

# Export the cd function
export -f cd

# Run the original Claude command
exec /usr/local/bin/claude "$@"
EOF

chmod +x /usr/local/bin/claude-restricted

# Start SSH daemon
echo "🔐 Starting SSH daemon..."
exec /usr/sbin/sshd -D