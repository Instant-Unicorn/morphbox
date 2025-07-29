#!/bin/bash
# One-line installer for MorphBox

set -e

echo "🚀 Installing MorphBox..."

# Clean up any existing installations
if [ -d "$HOME/.npm-global/lib/node_modules/morphbox" ] || [ -d "$HOME/.npm-global/lib/node_modules/.morphbox-"* ]; then
    echo "🧹 Cleaning up previous installation..."
    sudo rm -rf "$HOME/.npm-global/lib/node_modules/morphbox"* "$HOME/.npm-global/lib/node_modules/.morphbox-"* 2>/dev/null || true
fi

# Install MorphBox
echo "📦 Installing package..."
npm install -g morphbox-0.7.1.tgz

# The postinstall script will handle PATH setup automatically

echo ""
echo "✅ Installation complete!"
echo ""
echo "To start using MorphBox:"
echo "  1. Reload your shell: source ~/.bashrc (or ~/.zshrc)"
echo "  2. Run: morphbox --help"
echo ""