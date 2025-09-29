#!/bin/bash
# Docker entrypoint script for MorphBox
# Handles AI CLI auto-updates and starts SSH daemon

set -e

# Function to check and update an AI CLI tool
check_and_update_cli() {
    local CLI_NAME=$1
    local PACKAGE_NAME=$2
    local VERSION_CMD=$3

    echo "🔄 Checking for $CLI_NAME updates..."

    # Get current version if CLI is installed
    if command -v $CLI_NAME >/dev/null 2>&1; then
        CURRENT_VERSION=$($VERSION_CMD 2>/dev/null | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' || echo "0.0.0")
        echo "📌 Current $CLI_NAME version: $CURRENT_VERSION"
    else
        echo "⚠️  $CLI_NAME not found, installing..."
        CURRENT_VERSION="0.0.0"
    fi

    # Try to update CLI as morphbox user
    echo "🚀 Updating $CLI_NAME to latest version..."
    sudo -u morphbox npm update -g $PACKAGE_NAME 2>&1 | sudo -u morphbox tee /tmp/$CLI_NAME-update.log

    # Check if update was successful
    if [ $? -eq 0 ]; then
        NEW_VERSION=$($VERSION_CMD 2>/dev/null | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' || echo "unknown")
        if [ "$NEW_VERSION" != "$CURRENT_VERSION" ] && [ "$NEW_VERSION" != "unknown" ]; then
            echo "✅ $CLI_NAME updated from $CURRENT_VERSION to $NEW_VERSION"
        else
            echo "✅ $CLI_NAME is already up to date (version: $NEW_VERSION)"
        fi
    else
        echo "⚠️  $CLI_NAME update failed. Check /tmp/$CLI_NAME-update.log for details"
    fi
}

# Update all AI CLI tools
echo "🤖 Updating AI CLI tools..."

# Update Claude
check_and_update_cli "claude" "@anthropic-ai/claude-code" "claude --version"

# Update Gemini
check_and_update_cli "gemini" "@google/gemini-cli" "gemini --version"

# Update Codex
check_and_update_cli "codex" "@openai/codex" "codex --version"

# Ensure proper permissions on npm directories
chown -R morphbox:morphbox /usr/local/lib/node_modules /usr/local/bin /usr/local/share 2>/dev/null || true

# Ensure morphbox user starts in /workspace directory
echo "📁 Setting default directory to /workspace..."
echo "cd /workspace" >> /home/morphbox/.bashrc
echo "cd /workspace" >> /home/morphbox/.profile

# Start SSH daemon
echo "🔐 Starting SSH daemon..."
exec /usr/sbin/sshd -D