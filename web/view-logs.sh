#!/bin/bash
# Script to view browser logs with optional filtering

LOG_FILE="log/browser.log"

if [ ! -f "$LOG_FILE" ]; then
    echo "No log file found at $LOG_FILE"
    exit 1
fi

if [ $# -eq 0 ]; then
    # No arguments - show all logs
    cat "$LOG_FILE"
else
    # Filter logs by argument
    grep -i "$1" "$LOG_FILE"
fi

# Show log file info
echo ""
echo "---"
echo "Log file: $LOG_FILE"
echo "Total lines: $(wc -l < "$LOG_FILE")"
echo "File size: $(du -h "$LOG_FILE" | cut -f1)"