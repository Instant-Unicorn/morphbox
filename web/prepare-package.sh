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

# Copy scripts
cp ../morphbox-start scripts/
cp ../morphbox-start-docker scripts/
chmod +x scripts/*

# Copy other necessary files
cp -r ../scripts/* scripts/ 2>/dev/null || true
cp ../tmux.conf docker/ 2>/dev/null || true

# Update paths in morphbox-start to work from npm package location
# First, escape the original line properly
original_line='SCRIPT_DIR="\$( cd "\$( dirname "\${BASH_SOURCE\[0\]}" )" && pwd )"'
new_line='SCRIPT_DIR="\$( cd "\$( dirname "\${BASH_SOURCE\[0\]}" )" \&\& cd .. \&\& pwd )"'
sed -i.bak "s|${original_line}|${new_line}|" scripts/morphbox-start
sed -i.bak 's|WEB_DIR="\$SCRIPT_DIR/web"|WEB_DIR="\$SCRIPT_DIR"|' scripts/morphbox-start

# Clean up backup files
rm -f scripts/*.bak

echo "Package preparation complete!"
echo "Now run: npm pack"