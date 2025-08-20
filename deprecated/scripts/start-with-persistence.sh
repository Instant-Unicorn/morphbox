#!/bin/bash
# Quick start script for MorphBox with Claude persistence

set -e

echo "🚀 Starting MorphBox with Claude persistence enabled..."

# Navigate to web/docker directory where Docker files are located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
DOCKER_DIR="$SCRIPT_DIR/web/docker"

if [ ! -d "$DOCKER_DIR" ]; then
    echo "❌ Docker directory not found at $DOCKER_DIR"
    echo "   Please ensure you're running this from the MorphBox root directory"
    exit 1
fi

cd "$DOCKER_DIR"

# Check if docker compose is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Use the persistence-enabled configuration
if [ -f "docker-compose.persist.yml" ]; then
    echo "✅ Using docker-compose.persist.yml for persistent Claude updates"
    docker compose -f docker-compose.persist.yml up -d
else
    echo "⚠️  docker-compose.persist.yml not found, using standard configuration"
    echo "📝 Enabling persistence in standard docker-compose.yml..."
    
    # Create a temporary docker-compose with persistence enabled
    cp docker-compose.yml docker-compose.tmp.yml
    
    # Enable persistence volumes using sed
    sed -i.bak '
    /# Optional: Uncomment to persist Claude updates/,/# - claude-npm-bin:\/usr\/local\/bin/ {
        s/# - claude-npm-cache/- claude-npm-cache/
        s/# - claude-npm-bin/- claude-npm-bin/
    }
    /# claude-npm-cache:/,/# claude-npm-bin:/ {
        s/# claude-npm-cache:/claude-npm-cache:/
        s/# claude-npm-bin:/claude-npm-bin:/
        s/#   driver: local/  driver: local/
    }
    ' docker-compose.tmp.yml
    
    docker compose -f docker-compose.tmp.yml up -d
    
    # Clean up
    rm -f docker-compose.tmp.yml docker-compose.tmp.yml.bak
fi

echo ""
echo "✅ MorphBox is running with Claude persistence enabled!"
echo ""
echo "📌 Quick commands:"
echo "  - View logs: docker compose logs -f"
echo "  - Stop: docker compose down"
echo "  - Update Claude: docker exec morphbox-vm npm update -g @anthropic-ai/claude-code"
echo ""
echo "🔗 Access MorphBox web interface at: http://localhost:8010"