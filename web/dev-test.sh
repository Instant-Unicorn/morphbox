#!/bin/bash

# MorphBox Development Test Script
# Quick test script to verify panel functionality without Docker

echo "🚀 MorphBox Dev Test Script"
echo "=========================="
echo ""

# Check if dev server is running
check_server() {
    local port=$1
    if nc -z localhost $port 2>/dev/null; then
        echo "✅ Dev server running on port $port"
        return 0
    else
        echo "❌ Dev server not running on port $port"
        return 1
    fi
}

# Find which port the dev server is using
find_server_port() {
    # Default to 8008, the standard port
    if check_server 8008; then
        echo "Found server on port 8008"
        DEV_PORT=8008
        return 0
    fi
    # Check fallback ports
    for port in 8010 8012; do
        if check_server $port; then
            echo "Found server on port $port (non-standard)"
            DEV_PORT=$port
            return 0
        fi
    done
    echo "No dev server found. Starting one..."
    return 1
}

# Main execution
echo "1. Checking for running dev server..."
if find_server_port; then
    echo ""
    echo "2. Server is ready at http://localhost:$DEV_PORT"
    echo ""
    echo "3. Testing endpoints:"

    # Test main page
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:$DEV_PORT | grep -q "200"; then
        echo "   ✅ Main page responding"
    else
        echo "   ❌ Main page not responding"
    fi

    # Test custom panels API
    if curl -s http://localhost:$DEV_PORT/api/custom-panels | grep -q "panels"; then
        echo "   ✅ Custom panels API working"
    else
        echo "   ❌ Custom panels API not working"
    fi

    echo ""
    echo "4. Quick test instructions:"
    echo "   - Open http://localhost:$DEV_PORT in your browser"
    echo "   - Click the '+' button to open Panel Manager"
    echo "   - Create a custom panel"
    echo "   - Test the edit button (pencil icon) in the panel header"
    echo "   - Click the panel title to rename it"
    echo ""
    echo "5. Custom panels location: ~/morphbox/panels/"
    echo "   Panels are automatically loaded from this directory"
    echo ""
    echo "✨ Development environment ready!"
else
    echo "Starting dev server..."
    cd /home/kruger/projects/morphbox/web
    npm run dev &
    echo "Server starting... Please run this script again in a few seconds."
fi

echo ""
echo "Tips:"
echo "- Changes to Svelte files will hot-reload automatically"
echo "- Custom panels are loaded from ~/morphbox/panels/"
echo "- Use the edit button in custom panel headers to modify them"
echo "- Panel titles can be renamed by clicking on them"