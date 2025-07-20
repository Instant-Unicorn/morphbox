#!/bin/bash
# Script to persist Claude updates in the Docker image

set -e

echo "🔍 Checking current Claude version..."
CURRENT_VERSION=$(docker exec morphbox-vm npm list -g @anthropic-ai/claude-code --json 2>/dev/null | jq -r '.dependencies."@anthropic-ai/claude-code".version' || echo "unknown")
echo "Current version: $CURRENT_VERSION"

echo "📦 Checking for Claude updates..."
docker exec morphbox-vm npm update -g @anthropic-ai/claude-code

echo "🔍 Checking new Claude version..."
NEW_VERSION=$(docker exec morphbox-vm npm list -g @anthropic-ai/claude-code --json 2>/dev/null | jq -r '.dependencies."@anthropic-ai/claude-code".version' || echo "unknown")
echo "New version: $NEW_VERSION"

if [ "$CURRENT_VERSION" != "$NEW_VERSION" ]; then
    echo "✅ Claude updated from $CURRENT_VERSION to $NEW_VERSION"
    
    # Create a backup of the current Claude installation
    echo "💾 Creating backup of Claude installation..."
    docker exec morphbox-vm tar -czf /tmp/claude-backup.tar.gz -C /usr/local/lib/node_modules @anthropic-ai
    
    # Copy the backup to host
    docker cp morphbox-vm:/tmp/claude-backup.tar.gz ./claude-backup-$NEW_VERSION.tar.gz
    
    echo "📝 Update detected! To persist this update in the image:"
    echo "1. Add the following to your Dockerfile after the npm install line:"
    echo "   COPY claude-backup-$NEW_VERSION.tar.gz /tmp/"
    echo "   RUN tar -xzf /tmp/claude-backup-$NEW_VERSION.tar.gz -C /usr/local/lib/node_modules && rm /tmp/claude-backup-$NEW_VERSION.tar.gz"
    echo ""
    echo "2. Or rebuild the image to get the latest version directly"
else
    echo "✅ Claude is already up to date (version $CURRENT_VERSION)"
fi