# Docker Cleanup Guide for Morphbox

This guide explains how to properly clean up Docker containers and images used by Morphbox.

## Why Cleanup May Be Needed

- When updating Morphbox configuration
- When containers become corrupted
- To free up disk space
- To ensure fresh container builds with new settings

## Docker Cleanup Commands

### 1. Check Existing Containers and Images

```bash
# List all morphbox containers (running and stopped)
docker ps -a | grep morphbox

# List all morphbox Docker images
docker images | grep morphbox
```

### 2. Stop Running Containers

```bash
# Stop the morphbox container
docker stop morphbox-vm
```

### 3. Remove Containers

```bash
# Remove the morphbox container
docker rm morphbox-vm

# Force remove if container is stubborn
docker rm -f morphbox-vm
```

### 4. Remove Docker Images

```bash
# Remove specific morphbox image
docker rmi morphbox:latest

# Remove all morphbox images
docker rmi $(docker images -q morphbox)

# Force remove if images have dependencies
docker rmi -f $(docker images -q morphbox)
```

### 5. Complete Cleanup (One-Liner)

```bash
# Stop, remove container, and remove all images in one command
docker stop morphbox-vm 2>/dev/null; docker rm morphbox-vm 2>/dev/null; docker rmi $(docker images -q morphbox) 2>/dev/null
```

### 6. Verify Cleanup

```bash
# Should return nothing if cleanup was successful
docker ps -a | grep morphbox
docker images | grep morphbox
```

## When to Use These Commands

1. **Before changing morphbox.yml configuration**: Clean up to ensure new settings take effect
2. **After installation issues**: Start fresh if container creation failed
3. **Periodic maintenance**: Remove old unused images to free disk space

## After Cleanup

Once cleanup is complete, simply run `morphbox` again and it will:
1. Build a new Docker image with your current configuration
2. Create a fresh container with the latest settings
3. Start the development environment

## Troubleshooting

If you encounter permission errors:
```bash
# Use sudo (on Linux/Mac)
sudo docker stop morphbox-vm
sudo docker rm morphbox-vm
sudo docker rmi $(sudo docker images -q morphbox)
```

If images won't delete due to dependent child images:
```bash
# Find and remove dependent images
docker images --filter "dangling=true" -q | xargs docker rmi
```

## Additional Docker Maintenance

```bash
# Remove all stopped containers (not just morphbox)
docker container prune

# Remove all unused images
docker image prune

# Complete Docker cleanup (removes all unused data)
docker system prune -a
```

**Warning**: The `docker system prune -a` command will remove ALL unused Docker data, not just morphbox-related items.