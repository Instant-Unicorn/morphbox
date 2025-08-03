# Claude Auto-Update Persistence in MorphBox

This document explains how Claude auto-updates and persistence work in MorphBox Docker containers.

## Overview

MorphBox now includes automatic Claude updates with persistence by default, ensuring that:
- Claude is automatically updated to the latest version when the container starts
- Updates are persisted between container restarts (no re-downloads needed)
- The update process is transparent and doesn't interfere with your workflow

## Default Configuration (Automatic Persistence)

As of the latest update, MorphBox automatically:
1. **Checks for Claude updates** when the container starts
2. **Installs updates** if available
3. **Persists updates** using Docker volumes
4. **Reuses cached versions** on subsequent restarts

No configuration needed - it just works!

## How It Works

### 1. Docker Volumes
The following Docker volumes persist Claude installations:
- `claude-npm-cache`: Stores the npm global modules (`/usr/local/lib/node_modules`)
- `claude-npm-bin`: Stores the npm global binaries (`/usr/local/bin`)
- `claude-config`: Claude configuration files
- `claude-home`: User home directory with bash history and settings

### 2. Auto-Update on Start
When the MorphBox container starts:
1. The entrypoint script (`docker-entrypoint.sh`) checks for Claude updates
2. If updates are available, they are automatically installed
3. The updated version is stored in the persistent volumes
4. Subsequent restarts will use the cached version

### 3. Update Notifications
The `morphbox-start` script will display:
- Current Claude version
- Update status (if updates were installed)
- Confirmation that updates are persisted

## Manual Operations

### Check Current Version
```bash
docker exec morphbox-vm claude --version
```

### Force Manual Update
```bash
# From within the container
docker exec -it morphbox-vm bash -c "sudo -u morphbox npm update -g @anthropic-ai/claude-code"

# Or use the alias
docker exec -it morphbox-vm bash -c "su - morphbox -c 'claude-update'"
```

### Clear Cache and Force Fresh Install
```bash
# Stop the container
docker compose down

# Remove the persistence volumes
docker volume rm morphbox_claude-npm-cache morphbox_claude-npm-bin

# Restart - Claude will be freshly installed
./morphbox-start
```

## Alternative Configurations

### Using docker-compose.persist.yml
For explicit persistence configuration:
```bash
docker-compose -f docker-compose.persist.yml up -d
```

### Disable Persistence
To disable persistence (not recommended), comment out the volumes in `docker-compose.yml`:
```yaml
volumes:
  # - claude-npm-cache:/usr/local/lib/node_modules
  # - claude-npm-bin:/usr/local/bin
```

### Using start-with-persistence.sh
For automatic persistence setup:
```bash
./start-with-persistence.sh
```

## Benefits

1. **Faster Startup**: No need to re-download Claude on every container restart
2. **Bandwidth Savings**: Updates are downloaded only once
3. **Version Consistency**: The same Claude version persists across restarts
4. **Automatic Updates**: New versions are automatically installed when available
5. **Zero Configuration**: Works out of the box with default settings

## Troubleshooting

### Claude Not Updating
If Claude doesn't update automatically:
1. Check container logs: `docker logs morphbox-vm`
2. Check update log: `docker exec morphbox-vm cat /tmp/claude-update.log`
3. Manually trigger update (see above)

### Permission Issues
The entrypoint script automatically fixes permissions, but if needed:
```bash
docker exec morphbox-vm sudo chown -R morphbox:morphbox /usr/local/lib/node_modules /usr/local/bin
```

### Verify Persistence
To verify persistence is working:
```bash
# Check if volumes exist
docker volume ls | grep claude

# Inspect volume details
docker volume inspect morphbox_claude-npm-cache
```

## Technical Details

- Updates run as the `morphbox` user for security
- The entrypoint script handles all update logic
- Permissions are automatically corrected after updates
- Update logs are saved to `/tmp/claude-update.log` in the container