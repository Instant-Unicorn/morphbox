# Claude Auto-Update Persistence Solution

This document explains how to persist Claude auto-updates in MorphBox to avoid re-downloading updates on every container restart.

## Problem

Claude CLI has an auto-update mechanism that downloads updates when launched. Without persistence, these updates are lost when the Docker container restarts, causing Claude to re-download updates on every launch.

## Solutions

### Solution 1: Use Persistent Volumes (Recommended)

Use the provided `docker-compose.persist.yml` configuration that persists npm global packages:

```bash
# Stop existing container
docker-compose down

# Start with persistent volumes
docker-compose -f docker-compose.persist.yml up -d
```

This configuration creates persistent volumes for:
- `/usr/local/lib/node_modules` - NPM global packages including Claude
- `/usr/local/bin` - NPM global binaries
- `/home/morphbox/.claude` - Claude configuration
- `/home/morphbox/.config/claude-code` - Claude Code configuration

### Solution 2: Pre-Updated Docker Image

Build the optimized Dockerfile that pre-updates Claude during build:

```bash
# Build the optimized image
docker build -f Dockerfile.optimized -t morphbox:optimized .

# Update docker-compose.yml to use the new image
# Change image: morphbox:latest to image: morphbox:optimized
```

### Solution 3: Manual Update Persistence

Use the provided script to check for updates and create a backup:

```bash
# Check and backup Claude updates
./scripts/persist-claude-updates.sh

# This will create a backup file if updates are found
# Follow the script's instructions to add the backup to your Dockerfile
```

## How It Works

1. **Volume Persistence**: Docker volumes preserve the npm global directory between container restarts
2. **Pre-Update**: The optimized Dockerfile runs `npm update` during build to get the latest version
3. **Backup Script**: Creates a tarball of the updated Claude installation for manual persistence

## Benefits

- Faster Claude startup (no update check/download)
- Reduced bandwidth usage
- Consistent Claude version across restarts
- No "auto-update" message on every launch

## Maintenance

To manually update Claude when using persistent volumes:

```bash
# Connect to the container
docker exec -it morphbox-vm bash

# Update Claude as morphbox user
su - morphbox
npm update -g @anthropic-ai/claude-code
```

## Notes

- The persistent volume solution is recommended as it automatically preserves all updates
- The optimized Dockerfile needs to be rebuilt periodically to get the latest Claude version
- The manual backup method is useful for creating immutable images with specific Claude versions