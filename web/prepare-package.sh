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

# Clean up any existing installation
echo "Cleaning up existing installation..."
sudo rm -rf ~/.npm-global/lib/node_modules/morphbox ~/.npm-global/lib/node_modules/.morphbox-* 2>/dev/null || true
sudo rm -f ~/.npm-global/bin/morphbox 2>/dev/null || true

# Create npm package
echo "Creating npm package..."
npm pack

# Get the package filename
PACKAGE_FILE=$(ls morphbox-*.tgz | sort -V | tail -n1)

if [[ -z "$PACKAGE_FILE" ]]; then
    echo "Error: No package file found!"
    exit 1
fi

echo "Installing package: $PACKAGE_FILE"
npm install -g "$PACKAGE_FILE"

echo ""
echo "✅ MorphBox has been packaged and installed!"
echo "You can now run: morphbox --help"