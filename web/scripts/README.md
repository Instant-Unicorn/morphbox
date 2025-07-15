# MorphBox Claude Process Management

## Problem
When the terminal reloads or WebSocket connections are interrupted, Claude processes can accumulate in the Docker container, consuming system memory.

## Solution
We've implemented several fixes:

1. **Automatic Cleanup**: When a new connection is established, existing Claude processes are automatically killed
2. **Process Tracking**: The system now tracks Claude process PIDs for proper cleanup
3. **Connection Cleanup**: When WebSocket disconnects, Claude processes are properly terminated
4. **Process Limits**: Set `MAX_CLAUDE_PROCESSES` environment variable (default: 1)

## Manual Cleanup Scripts

### Quick Cleanup
```bash
npm run cleanup:claude
```
This will show all Claude processes and ask for confirmation before killing them.

### Force Cleanup (no confirmation)
```bash
npm run cleanup:claude:force
```

### Direct Script Usage
```bash
./scripts/cleanup-claude.sh          # Interactive mode
./scripts/cleanup-claude.sh --force  # Force kill all processes
```

## Environment Variables

- `MAX_CLAUDE_PROCESSES`: Maximum number of concurrent Claude processes allowed (default: 1)

## Docker Note
The processes run inside the Docker container (`morphbox-vm`), not directly on the host system. This is why you see Docker using the memory - it's managing the containerized processes.