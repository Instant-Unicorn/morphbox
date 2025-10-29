#!/bin/bash
# Prepare MorphBox for npm packaging by copying all necessary files

set -e

echo "🚀 Preparing MorphBox package with COMPLETE cleanup..."

# Request sudo password upfront to avoid interruption later
echo "This script requires sudo access to clean up and install the package globally."
echo "Please enter your password now to avoid interruption during the installation process."
sudo -v

# Keep sudo alive during the script execution
while true; do sudo -n true; sleep 60; kill -0 "$$" || exit; done 2>/dev/null &

# Complete cleanup of all caches first
echo "🧹 Performing AGGRESSIVE cache cleanup..."
echo "  Cleaning npm cache..."
npm cache clean --force 2>/dev/null || true

echo "  Cleaning Docker build cache..."
docker builder prune -f 2>/dev/null || true

echo "  Removing ALL old global morphbox installations..."
# Remove from npm global paths
sudo npm uninstall -g morphbox 2>/dev/null || true
sudo rm -rf /usr/local/lib/node_modules/morphbox 2>/dev/null || true
sudo rm -f /usr/local/bin/morphbox 2>/dev/null || true
# Remove from nvm paths
rm -rf ~/.nvm/versions/node/*/lib/node_modules/morphbox 2>/dev/null || true
rm -f ~/.nvm/versions/node/*/bin/morphbox 2>/dev/null || true
# Remove from user npm paths
rm -rf ~/.npm-global/lib/node_modules/morphbox 2>/dev/null || true
rm -f ~/.npm-global/bin/morphbox 2>/dev/null || true

# Complete rebuild of the project first
echo "🔨 Performing complete rebuild of the project..."
echo "  Cleaning ALL build artifacts..."
rm -rf .svelte-kit build node_modules/.vite dist .turbo 2>/dev/null || true

# Clean up old package files
echo "  Removing old package files..."
rm -f morphbox-*.tgz 2>/dev/null || true

echo "  Installing dependencies..."
npm install

echo "  Building the project..."
npm run build

# Verify the build succeeded
if [ ! -d "build" ]; then
    echo "❌ ERROR: Build directory not created. Build may have failed."
    exit 1
fi

echo "✅ Build completed successfully"

# Docker image rebuild - intelligent caching with versioning
echo "🐳 Building Docker container..."
cd docker

# Get version from package.json
MORPHBOX_VERSION=$(node -e "console.log(require('../package.json').version)" 2>/dev/null || echo "unknown")
echo "Building version: $MORPHBOX_VERSION"

# Stop and remove running containers
echo "Stopping running morphbox containers..."
docker stop $(docker ps -q --filter "name=morphbox") 2>/dev/null || true
docker rm $(docker ps -aq --filter "name=morphbox") 2>/dev/null || true

# Check if Dockerfile has changed since last build
DOCKERFILE_CHANGED=false
IMAGE_EXISTS=false
IMAGE_TAG="morphbox:${MORPHBOX_VERSION}"

if docker image inspect "$IMAGE_TAG" >/dev/null 2>&1; then
    IMAGE_EXISTS=true
    # Verify version label matches
    IMAGE_LABEL_VERSION=$(docker image inspect "$IMAGE_TAG" --format '{{index .Config.Labels "morphbox.version"}}' 2>/dev/null || echo "")

    if [[ "$IMAGE_LABEL_VERSION" != "$MORPHBOX_VERSION" ]]; then
        echo "Image version mismatch (label: $IMAGE_LABEL_VERSION, expected: $MORPHBOX_VERSION)"
        DOCKERFILE_CHANGED=true
    fi

    # Get image build time
    IMAGE_BUILD_TIME=$(docker inspect "$IMAGE_TAG" --format='{{.Created}}' | xargs -I {} date -d {} +%s 2>/dev/null || echo "0")
    # Get Dockerfile modification time
    DOCKERFILE_MTIME=$(stat -c %Y Dockerfile 2>/dev/null || stat -f %m Dockerfile 2>/dev/null || echo "999999999")

    if [ "$DOCKERFILE_MTIME" -gt "$IMAGE_BUILD_TIME" ]; then
        echo "Dockerfile has changed since last build - will rebuild from scratch"
        DOCKERFILE_CHANGED=true
    fi
fi

# Decide build strategy
if [ "$IMAGE_EXISTS" = "false" ]; then
    echo "No existing morphbox:${MORPHBOX_VERSION} image found - building fresh image..."
    # First time build - use caching but ensure we get latest base image
    docker build --pull --build-arg MORPHBOX_VERSION="$MORPHBOX_VERSION" -t "$IMAGE_TAG" -f Dockerfile .
elif [ "$DOCKERFILE_CHANGED" = "true" ]; then
    echo "Dockerfile changed or version mismatch - rebuilding image from scratch..."
    # Force rebuild when Dockerfile changes or version doesn't match
    docker build --no-cache --pull --build-arg MORPHBOX_VERSION="$MORPHBOX_VERSION" -t "$IMAGE_TAG" -f Dockerfile .
else
    echo "Using cached image layers for faster build..."
    # Normal incremental build using cache
    docker build --build-arg MORPHBOX_VERSION="$MORPHBOX_VERSION" -t "$IMAGE_TAG" -f Dockerfile .
fi

# Tag as latest for backwards compatibility
docker tag "$IMAGE_TAG" morphbox:latest

# Verify the image was tagged correctly
if docker image inspect "$IMAGE_TAG" >/dev/null 2>&1; then
    echo "✅ $IMAGE_TAG image built and tagged successfully"
    echo "✅ Also tagged as morphbox:latest for backwards compatibility"
else
    echo "❌ ERROR: Failed to build or tag $IMAGE_TAG image"
    exit 1
fi

# No need to build again with docker-compose since we already built the versioned image
# Just recreate the container with the new image
echo "Recreating container with updated image..."

# Create a temporary docker-compose file that uses the image we just built
TEMP_COMPOSE="/tmp/morphbox-compose-rebuild.yml"
cat > "$TEMP_COMPOSE" << EOF
services:
  morphbox-vm:
    image: $IMAGE_TAG
    container_name: morphbox-vm
    hostname: morphbox-vm
    ports:
      - "2222:22"
      # Expose dev server ports (uses MORPHBOX_HOST env var, defaults to 127.0.0.1)
      - "${MORPHBOX_HOST:-127.0.0.1}:5173:5173"
      - "${MORPHBOX_HOST:-127.0.0.1}:5174:5174"
      - "${MORPHBOX_HOST:-127.0.0.1}:5175:5175"
      - "${MORPHBOX_HOST:-127.0.0.1}:5176:5176"
      - "${MORPHBOX_HOST:-127.0.0.1}:5177:5177"
      - "${MORPHBOX_HOST:-127.0.0.1}:5178:5178"
      - "${MORPHBOX_HOST:-127.0.0.1}:5179:5179"
    volumes:
      - claude-config:/home/morphbox/.config/claude-code
      - ./workspace:/workspace
      - ./:/workspace/morphbox
      - claude-home:/home/morphbox
      - claude-npm-cache:/usr/local/lib/node_modules
      - claude-npm-bin:/usr/local/bin
    environment:
      - TERM=xterm-256color
      - COLORTERM=truecolor
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY:-}
    restart: unless-stopped
    networks:
      - morphbox-network

networks:
  morphbox-network:
    driver: bridge

volumes:
  claude-config:
    driver: local
  claude-home:
    driver: local
  claude-npm-cache:
    driver: local
  claude-npm-bin:
    driver: local
EOF

docker compose -f "$TEMP_COMPOSE" up -d morphbox-vm
rm -f "$TEMP_COMPOSE"

# Wait for container to be ready
echo "Waiting for container to be ready..."
sleep 5

# Verify the container is running and check for AI tools
if docker ps | grep -q morphbox-vm; then
    echo "✅ Container rebuilt and running successfully"

    # Verify AI tools are installed
    echo "Verifying AI tools installation..."

    # Check npm packages are installed
    INSTALLED_PACKAGES=$(docker exec morphbox-vm npm list -g --depth=0 2>/dev/null)

    if echo "$INSTALLED_PACKAGES" | grep -q "@anthropic-ai/claude-code"; then
        echo "  ✅ Claude CLI installed"
    else
        echo "  ❌ Claude CLI not found"
    fi

    if echo "$INSTALLED_PACKAGES" | grep -q "@google/gemini-cli"; then
        echo "  ✅ Gemini CLI installed"
    else
        echo "  ❌ Gemini CLI not found"
    fi

    if echo "$INSTALLED_PACKAGES" | grep -q "@openai/codex"; then
        echo "  ✅ Codex CLI installed"
    else
        echo "  ❌ Codex CLI not found"
    fi
else
    echo "⚠️  Container may not be running. Check with: docker ps"
fi

cd ..

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

# Copy scripts - morphbox-start is already the current version
# No need to overwrite it with an old packaged version
# Just ensure all scripts are executable
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
echo ""
echo "🚨 IMPORTANT: Clear your browser cache!"
echo "   - Chrome/Firefox: Press Ctrl+Shift+R (or Cmd+Shift+R on Mac)"
echo "   - Or open DevTools → Network → Check 'Disable cache'"
echo ""
echo "📦 Package version: $PACKAGE_FILE"
echo "🎯 You can now run: morphbox --help"
echo "🔥 For complete reset: morphbox --reset"