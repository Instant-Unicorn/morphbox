#!/bin/bash
# Prepare MorphBox for npm packaging by copying all necessary files

set -e

echo "Preparing MorphBox package..."

# Skip Docker recreation during packaging
echo "📦 Packaging mode - skipping Docker container recreation"
export SKIP_DOCKER_RECREATE=true

# Create directories
mkdir -p scripts
# Don't create docker directory yet - check if it exists with files first

# Check if docker directory already exists with required files
if [[ -f docker/Dockerfile ]] && [[ -f docker/docker-entrypoint.sh ]] && [[ -f docker/docker-compose.yml ]]; then
    echo "✅ Using Docker files from web/docker directory"
    # Docker files already in place, nothing to copy
else
    echo "❌ ERROR: Docker files not found in web/docker directory!"
    echo "   Expected files:"
    echo "   - docker/Dockerfile"
    echo "   - docker/docker-entrypoint.sh"
    echo "   - docker/docker-compose.yml"
    echo "   - docker/docker-compose.persist.yml (optional)"
    echo ""
    echo "   Please ensure Docker files exist in web/docker/ before packaging."
    exit 1
fi

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

# Remove old package files to avoid confusion
rm -f morphbox*.tgz

# Create npm package
echo "Creating npm package..."
npm pack

# Get the package filename (should be morphbox-X.X.X.tgz)
PACKAGE_FILE=$(ls morphbox-*.tgz 2>/dev/null | grep -E 'morphbox-[0-9]+\.[0-9]+\.[0-9]+\.tgz' | sort -V | tail -n1)

if [[ -z "$PACKAGE_FILE" ]]; then
    echo "Error: No package file found!"
    exit 1
fi

echo "Installing package: $PACKAGE_FILE"
npm install -g "$PACKAGE_FILE"

echo ""
echo "✅ MorphBox has been packaged and installed!"
echo "You can now run: morphbox --help"