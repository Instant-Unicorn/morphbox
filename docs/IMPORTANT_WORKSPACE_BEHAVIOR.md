# CRITICAL: MorphBox Workspace Behavior

## Core Design Principle
**MorphBox MUST ALWAYS use the current working directory as the workspace.**

When `morphbox` is run from any directory, that directory should be mounted as `/workspace` in the container.

## Current Issue (as of commit 4130874)
The packaged version at `/home/kruger/.nvm/versions/node/v22.19.0/lib/node_modules/morphbox/scripts/morphbox-start` has code (lines 364-370) that prevents container recreation when workspaces differ:

```bash
if [[ "$CONTAINER_WORKSPACE" != "$USER_DIR" ]]; then
    # For multi-instance support, we can't recreate the container
    # as it would break other instances. Just use the existing container.
    warn "Container is using workspace: $CONTAINER_WORKSPACE"
    warn "Your current directory: $USER_DIR"
    info "Using existing container with different workspace"
    NEED_CREATE=false
```

**This is WRONG and breaks the core functionality.**

## Correct Behavior
When the container's workspace doesn't match the current directory:
1. The container SHOULD be stopped and removed
2. A new container SHOULD be created with the correct workspace mount
3. The user's current directory SHOULD always be accessible as `/workspace` in the container

## Why This Matters
- Users run `morphbox` from their project directories
- The whole point is to provide a sandboxed development environment for the CURRENT project
- Running morphbox from `/home/user/project-a` should give access to project-a files
- Running morphbox from `/home/user/project-b` should give access to project-b files
- The morphbox installation directory itself should NEVER be the workspace

## DO NOT
- Never disable workspace recreation when directories differ
- Never force users to manually remove containers
- Never mount the morphbox installation directory as workspace
- Never compromise this core functionality for "multi-instance support"

## Implementation Note
Multi-instance support should be handled differently, perhaps with:
- Named containers (morphbox-vm-PORT or morphbox-vm-HASH)
- Separate containers per workspace
- But NEVER by breaking the single-instance workspace behavior