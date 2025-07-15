#!/bin/bash

# Cleanup script for orphaned Claude processes in Docker container

echo "🔍 Checking for Claude processes in Docker container..."
echo ""

# Get Claude processes
PROCESSES=$(docker exec morphbox-vm ps aux | grep -E "claude.*dangerously-skip-permissions" | grep -v grep)

if [ -z "$PROCESSES" ]; then
    echo "✅ No Claude processes found. System is clean!"
    exit 0
fi

# Count processes
COUNT=$(echo "$PROCESSES" | wc -l)
echo "Found $COUNT Claude process(es):"
echo ""

# Display processes
echo "$PROCESSES" | awk '{printf "PID: %-8s CPU: %-6s MEM: %-6s CMD: %s\n", $2, $3, $4, substr($0, index($0,$11), 80)}'
echo ""

# Kill all processes without confirmation if --force is passed
if [ "$1" == "--force" ]; then
    echo "🔪 Force killing all processes..."
    echo "$PROCESSES" | awk '{print $2}' | while read pid; do
        echo -n "Killing PID $pid... "
        if docker exec morphbox-vm kill -9 $pid 2>/dev/null; then
            echo "✅"
        else
            echo "❌"
        fi
    done
else
    # Ask for confirmation
    read -p "Kill all Claude processes? (y/N): " -n 1 -r
    echo ""
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Aborted."
        exit 0
    fi
    
    echo ""
    echo "🔪 Killing processes..."
    echo "$PROCESSES" | awk '{print $2}' | while read pid; do
        echo -n "Killing PID $pid... "
        if docker exec morphbox-vm kill -9 $pid 2>/dev/null; then
            echo "✅"
        else
            echo "❌"
        fi
    done
fi

echo ""
echo "✅ Cleanup complete!"

# Check if any processes remain
sleep 1
REMAINING=$(docker exec morphbox-vm ps aux | grep -E "claude.*dangerously-skip-permissions" | grep -v grep | wc -l)
if [ "$REMAINING" -gt 0 ]; then
    echo "⚠️  Warning: $REMAINING process(es) still running."
else
    echo "✅ All Claude processes have been terminated."
fi