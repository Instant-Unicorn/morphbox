#!/bin/bash
# MorphBox Nuclear Reset Script
# This completely removes all MorphBox installations, caches, and Docker artifacts

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${RED}🔥🔥🔥 MORPHBOX NUCLEAR RESET 🔥🔥🔥${NC}"
echo -e "${YELLOW}This will completely remove:${NC}"
echo "  - All running MorphBox instances"
echo "  - All MorphBox Docker containers and images"
echo "  - All Docker volumes (claude-*, morphbox-*)"
echo "  - npm cache and global morphbox package"
echo "  - All morphbox installations (except source)"
echo ""
read -p "Are you SURE you want to continue? Type 'YES' to confirm: " -r CONFIRM
echo ""

if [[ "$CONFIRM" != "YES" ]]; then
    echo -e "${GREEN}Reset cancelled. Good choice for safety!${NC}"
    exit 0
fi

echo -e "${YELLOW}Starting complete reset...${NC}"

# Step 1: Stop all morphbox processes
echo -e "\n${GREEN}[1/8]${NC} Stopping all MorphBox processes..."
pkill -f morphbox 2>/dev/null || true
pkill -f "node.*server-packaged" 2>/dev/null || true
pkill -f "node.*websocket-proxy" 2>/dev/null || true
sleep 2

# Step 2: Stop and remove all Docker containers
echo -e "\n${GREEN}[2/8]${NC} Removing Docker containers..."
MORPHBOX_CONTAINERS=$(docker ps -aq --filter "name=morphbox" 2>/dev/null || true)
if [ -n "$MORPHBOX_CONTAINERS" ]; then
    docker stop $MORPHBOX_CONTAINERS 2>/dev/null || true
    docker rm -f $MORPHBOX_CONTAINERS 2>/dev/null || true
fi

# Step 3: Remove all Docker images
echo -e "\n${GREEN}[3/8]${NC} Removing Docker images..."
MORPHBOX_IMAGES=$(docker images -q "*morphbox*" 2>/dev/null || true)
if [ -n "$MORPHBOX_IMAGES" ]; then
    docker rmi -f $MORPHBOX_IMAGES 2>/dev/null || true
fi
# Also remove by repository name
docker rmi -f morphbox:latest 2>/dev/null || true
docker rmi -f morphbox-vm:latest 2>/dev/null || true
docker rmi -f docker-morphbox-vm:latest 2>/dev/null || true
docker rmi -f tmp-morphbox-vm:latest 2>/dev/null || true

# Step 4: Remove all Docker volumes
echo -e "\n${GREEN}[4/8]${NC} Removing Docker volumes..."
CLAUDE_VOLUMES=$(docker volume ls -q | grep -E "claude|morphbox" 2>/dev/null || true)
if [ -n "$CLAUDE_VOLUMES" ]; then
    docker volume rm $CLAUDE_VOLUMES 2>/dev/null || true
fi

# Step 5: Clean Docker system
echo -e "\n${GREEN}[5/8]${NC} Pruning Docker system..."
docker system prune -f --volumes 2>/dev/null || true

# Step 6: Clear npm cache
echo -e "\n${GREEN}[6/8]${NC} Clearing npm cache..."
npm cache clean --force 2>/dev/null || true

# Step 7: Uninstall global morphbox package
echo -e "\n${GREEN}[7/8]${NC} Uninstalling global morphbox package..."
npm uninstall -g morphbox 2>/dev/null || true
# Also try with different paths
npm uninstall -g morphbox --prefix ~/.npm-global 2>/dev/null || true
# Remove from nvm paths
rm -f ~/.nvm/versions/node/*/bin/morphbox 2>/dev/null || true
rm -rf ~/.nvm/versions/node/*/lib/node_modules/morphbox 2>/dev/null || true

# Step 8: Remove all morphbox installations (except source)
echo -e "\n${GREEN}[8/8]${NC} Removing all morphbox installations..."
# Find and remove all morphbox directories except the source
find ~ -name "morphbox" -type d \
    -not -path "*/projects/morphbox*" \
    -not -path "*/.git/*" \
    2>/dev/null | while read -r dir; do
    echo "  Removing: $dir"
    rm -rf "$dir" 2>/dev/null || true
done

# Remove package files
find ~ -name "morphbox-*.tgz" -type f 2>/dev/null | while read -r file; do
    echo "  Removing: $file"
    rm -f "$file" 2>/dev/null || true
done

# Remove port-finder tracking files
rm -f /tmp/morphbox-*.pid 2>/dev/null || true
rm -f ~/.morphbox-instances.json 2>/dev/null || true

echo -e "\n${GREEN}✅ RESET COMPLETE!${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Clear your browser cache:"
echo "   - Chrome/Firefox: Ctrl+Shift+R (or Cmd+Shift+R on Mac)"
echo "   - Or open DevTools → Network → Disable cache"
echo ""
echo "2. Rebuild MorphBox fresh:"
echo "   cd ~/projects/morphbox/web"
echo "   npm install"
echo "   npm run build"
echo "   ./prepare-package.sh"
echo ""
echo "3. Start fresh:"
echo "   morphbox"
echo ""
echo -e "${GREEN}Your MorphBox environment is now completely clean!${NC}"