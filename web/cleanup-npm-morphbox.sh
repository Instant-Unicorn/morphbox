#!/bin/bash
# Cleanup script for morphbox npm installation issues

echo "Cleaning up morphbox npm installation..."

# Remove all morphbox-related directories
rm -rf /home/kruger/.npm-global/lib/node_modules/morphbox
rm -rf /home/kruger/.npm-global/lib/node_modules/.morphbox-*
rm -rf /home/kruger/.npm-global/lib/node_modules/morphbox-*

# Remove the symlink
rm -f /home/kruger/.npm-global/bin/morphbox

# Remove the old VM-based morphbox symlink if it exists
rm -f /usr/local/bin/morphbox

echo "Cleanup complete!"
echo ""
echo "Now you can install morphbox with:"
echo "npm install -g morphbox-0.7.1.tgz"