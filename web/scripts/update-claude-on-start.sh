#!/bin/bash
# Helper script to ensure Claude is updated when morphbox starts

set -e

# Check if the container is already running
if docker ps --format '{{.Names}}' | grep -q '^morphbox-vm$'; then
    echo "🔄 Updating Claude in running container..."
    docker exec morphbox-vm bash -c '
        echo "🚀 Checking for Claude updates..."
        sudo -u morphbox npm update -g @anthropic-ai/claude-code
        NEW_VERSION=$(sudo -u morphbox claude --version 2>/dev/null | grep -oE "[0-9]+\.[0-9]+\.[0-9]+" || echo "unknown")
        echo "✅ Claude version: $NEW_VERSION"
    '
else
    echo "📦 Container not running. Claude will be updated when container starts."
fi