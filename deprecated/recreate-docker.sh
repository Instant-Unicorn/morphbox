#!/bin/bash

# Script to recreate the morphbox Docker container
# This will stop, remove, rebuild and restart the container with NO cache

echo "🔄 Recreating morphbox Docker container (full rebuild, no cache)..."

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
DOCKER_DIR="$SCRIPT_DIR/docker"

# Get the user's current working directory (from env or where they ran the script from)
# When called from morphbox command, MORPHBOX_USER_DIR is set
# When called from prepare-package.sh, we should skip recreation
USER_DIR="${MORPHBOX_USER_DIR:-$(pwd)}"

# Check if we're being called from prepare-package.sh
if [[ "$SKIP_DOCKER_RECREATE" == "true" ]]; then
    echo "⏭️  Skipping Docker recreation (called from prepare-package.sh)"
    exit 0
fi

echo "📁 Script directory: $SCRIPT_DIR"
echo "📁 User directory: $USER_DIR"

# Navigate to docker directory for build context
cd "$DOCKER_DIR" || exit 1

# Stop and remove existing container
echo "⏹️  Stopping existing container..."
docker compose down -v  # -v removes volumes too

# Force remove the container if it still exists
echo "🧹 Ensuring container is fully removed..."
docker rm -f morphbox-vm 2>/dev/null || true

# Remove ALL related images to force complete rebuild
echo "🗑️  Removing ALL morphbox-related images..."
docker rmi -f docker-morphbox-vm 2>/dev/null || true
docker rmi -f docker_morphbox-vm 2>/dev/null || true
docker rmi -f morphbox-morphbox-vm 2>/dev/null || true
docker rmi -f tmp-morphbox-vm 2>/dev/null || true

# Remove any dangling images
echo "🧹 Removing dangling images..."
docker image prune -f

# Clear Docker build cache
echo "🔥 Clearing Docker build cache..."
docker builder prune -f

# Create a temporary docker-compose file with correct volume mounts
TEMP_COMPOSE="/tmp/morphbox-recreate-$$.yml"
echo "📝 Creating temporary docker-compose with correct mounts..."

cat > "$TEMP_COMPOSE" << EOF
services:
  morphbox-vm:
    build:
      context: $DOCKER_DIR
      dockerfile: Dockerfile
    container_name: morphbox-vm
    hostname: morphbox-vm
    ports:
      - "2222:22"  # SSH port mapping
    volumes:
      # Persist Claude authentication data
      - claude-config:/home/morphbox/.config/claude-code
      # Mount USER'S CURRENT DIRECTORY as workspace (absolute path)
      - $USER_DIR:/workspace
      # Mount morphbox package directory for access to project files
      - $SCRIPT_DIR:/workspace/morphbox-web
      # Persist bash history and other user data
      - claude-home:/home/morphbox
      # Persist Claude updates (prevents re-downloads)
      - claude-npm-cache:/usr/local/lib/node_modules
      - claude-npm-bin:/usr/local/bin
    environment:
      - TERM=xterm-256color
      - COLORTERM=truecolor
      - ANTHROPIC_API_KEY=\${ANTHROPIC_API_KEY:-}
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

# Rebuild with absolutely no cache using the temp compose file
echo "🔨 Building new container from scratch (no cache)..."
docker compose -f "$TEMP_COMPOSE" build --no-cache morphbox-vm

# Start the container
echo "🚀 Starting the new container..."
docker compose -f "$TEMP_COMPOSE" up -d

# Check if container is running
if docker ps | grep -q morphbox-vm; then
    echo "✅ Container recreated successfully!"
    echo "📊 Container status:"
    docker ps --filter "name=morphbox-vm" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    echo ""
    echo "📝 Volume mounts:"
    echo "   - Your directory: $USER_DIR -> /workspace"
    echo "   - MorphBox web: $SCRIPT_DIR -> /workspace/morphbox-web"
    echo ""
    echo "📝 To connect via SSH: ssh morphbox@localhost -p 2222"
    echo "   Password: morphbox"
    
    # Clean up temp file
    rm -f "$TEMP_COMPOSE"
else
    echo "❌ Failed to start container. Check logs with: docker compose -f $TEMP_COMPOSE logs"
    exit 1
fi