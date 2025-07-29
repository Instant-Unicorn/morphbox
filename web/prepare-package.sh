#!/bin/bash
# Prepare MorphBox for npm packaging by copying all necessary files

set -e

echo "Preparing MorphBox package..."

# Create directories
mkdir -p scripts
mkdir -p docker

# Copy Docker files
cp ../Dockerfile docker/
cp ../docker-compose.yml docker/
cp ../docker-compose.persist.yml docker/

# Copy scripts - use the packaged version for morphbox-start
cp scripts/morphbox-start-packaged scripts/morphbox-start
cp ../morphbox-start-docker scripts/
chmod +x scripts/*

# Copy other necessary files
cp -r ../scripts/* scripts/ 2>/dev/null || true
cp ../tmux.conf docker/ 2>/dev/null || true

# Replace server-packaged.js with version that doesn't use agents
cp server-packaged-noagents.js server-packaged.js

# Use production hooks that don't initialize agent managers
cp src/hooks.server.production.ts src/hooks.server.ts

# Rebuild to use production hooks
echo "Rebuilding with production hooks..."
npm run build

# Restore original hooks
git checkout src/hooks.server.ts

# Clean up backup files
rm -f scripts/*.bak

echo "Package preparation complete!"
echo "Now run: npm pack"