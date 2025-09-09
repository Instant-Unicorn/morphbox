# MorphBox Changelog

## 2025-01-14 - v0.9.5

### Comprehensive Documentation Update
- **Added**: Professional README with badges, quick start, and clear value proposition
- **Added**: Complete Getting Started guide with prerequisites checker and walkthrough
- **Added**: Seven hands-on tutorials covering various development scenarios
- **Added**: Extensive troubleshooting guide with categorized solutions
- **Improved**: Overall documentation structure for better discoverability
- **Fixed**: Workspace directory mounting issue (third occurrence - now properly fixed)

### Why This Release
This release focuses on making MorphBox more accessible to new users with comprehensive documentation, tutorials, and a polished presentation. The project is now ready for broader community sharing.

## 2025-01-14 - v0.9.4 (Update #2)

### Workspace Directory Mounting Fix (Third Occurrence)
- **Fixed**: Morphbox was mounting its installation directory instead of user's current directory
- **Root Cause**: Previous fix was in place but not properly propagated to npm package
- **Solution**: Verified MORPHBOX_USER_DIR environment variable is correctly set in bin/morphbox.js
- **Verified**: Container now correctly mounts the directory where `morphbox` command is run as `/workspace`
- **Testing**: Confirmed working from multiple directories (e.g., `/tmp` correctly mounts as workspace)

## 2025-01-14 - v0.9.4 (Update)

### WebSocket Connection Stability Fix
- **Fixed**: Resolved infinite WebSocket disconnect loop (error code 1005)  
- **Fixed**: SSH authentication failures in Docker container by enabling PermitEmptyPasswords
- **Improved**: Updated prompt queue detection logic to use simpler innerText approach
- **Note**: Prompt queue auto-detection still requires additional refinement

## 2025-09-08 - v0.9.4

### Removed Password Authentication - Simplified Security Model

**Problem**:
- Persistent WebSocket connection failures with "All configured authentication methods failed" error
- Password-based authentication was security theater - hardcoded password provided no real security
- Cyclic failures between WebSocket proxy startup and browser connections

**Solution**:
- Completely removed password authentication from the system
- Security now relies entirely on network isolation (localhost/VPN access only)
- Simplified SSH configuration to allow empty passwords for the isolated container

**Changes**:
- **Docker Configuration**:
  - Modified Dockerfile to remove password setup and enable PermitEmptyPasswords
  - Removed MORPHBOX_PASSWORD build argument from docker-compose.yml
- **WebSocket Proxy**:
  - Removed all password handling logic
  - Simplified SSH connection to use empty password
- **Launcher Scripts**:
  - Removed MORPHBOX_VM_PASSWORD environment variables
  - Cleaned up password-related configuration

**Security Note**:
- Container remains secure through network isolation
- VPN mode restricts access to VPN-connected clients only
- External mode requires explicit user confirmation and shows security warnings

**Files Modified**:
- `web/docker/Dockerfile` - Removed password setup, enabled passwordless SSH
- `web/docker/docker-compose.yml` - Removed password build argument
- `web/websocket-proxy.js` - Simplified to remove password handling
- `web/scripts/morphbox-start-packaged` - Removed password environment variables
- npm package launcher scripts updated accordingly

## 2025-08-21 - v0.9.2

### Fixed Single Ctrl+C Shutdown Issue

**Problem**:
- MorphBox required two Ctrl+C presses to shut down properly
- First Ctrl+C would return to shell prompt while cleanup continued in background
- Docker container wasn't being stopped properly

**Root Cause**:
- Node.js wrapper wasn't waiting for child process cleanup
- Bash scripts used blocking `sleep` loops that prevented signal handling
- Packaged version missing proper signal handling

**Solution**:
- Added proper signal handling to Node.js wrapper that waits for cleanup
- Replaced `while true; sleep 5` loops with `wait` command for immediate signal handling
- Fixed docker compose cleanup path in packaged version
- Added lock file to prevent concurrent cleanup calls

**Files Modified**:
- `bin/morphbox.js` - Added signal handling to wait for child cleanup
- `morphbox-start` - Replaced sleep loop with wait command
- `web/bin/morphbox.js` - Added signal handling for packaged version
- `web/scripts/morphbox-start` - Fixed signal handling and docker cleanup
- `web/scripts/morphbox-start-packaged` - Fixed signal handling and docker cleanup

## 2025-08-13

### Fix File Explorer Folder Creation Error

**Problem**:
- "Failed to create folder" error when using contextual menu in File Explorer
- File operations (create, delete, rename) were failing

**Root Cause**:
- File API endpoints were using hardcoded `/workspace` directory path
- This path only exists in Docker containers, not in local development

**Solution**:
- Updated all file API endpoints to use dynamic WORKSPACE_DIR from workspace.ts
- workspace.ts now properly detects environment:
  - Docker: uses `/workspace`
  - Local development: uses git root directory or current working directory

**Files Modified**:
- `src/routes/api/files/create/+server.ts` - Use dynamic workspace path
- `src/routes/api/files/delete/+server.ts` - Use dynamic workspace path
- `src/routes/api/files/read/+server.ts` - Use dynamic workspace path
- `src/routes/api/files/rename/+server.ts` - Use dynamic workspace path
- `src/routes/api/files/write/+server.ts` - Use dynamic workspace path

### Fix Lint Errors and Accessibility Warnings

**Issues Fixed**:
- TypeScript errors in websocket.ts (null/undefined handling)
- Missing properties in Settings interface (editor, defaultPanelColors)
- Accessibility warnings in BasePanel, Terminal, WorkspaceTabs components
- TypeScript annotations in JavaScript files

**Files Modified**:
- `src/lib/server/websocket.ts` - Fixed null sessionId handling
- `src/lib/panels/Settings/settings-store.ts` - Added missing interface properties
- `src/lib/stores/panels.ts` - Added optional chaining for defaultColors
- `src/lib/panels/BasePanel.svelte` - Changed resize handle to button, added keyboard support
- `src/lib/Terminal.svelte` - Added ARIA roles, fixed TypeScript errors
- `src/lib/components/WorkspaceTabs.svelte` - Added dialog role and keyboard handling
- `src/types/terminal.d.ts` - Created global type definitions
- Various documentation pages - Fixed TypeScript annotations

## 2025-01-07

### Fix Docker Compose Path Issue

**Problem**:
- MorphBox failed to start with "no configuration file provided: not found" error
- Claude auto-update was not running because container couldn't start

**Root Cause**:
- morphbox-start script was looking for docker-compose.yml in the project root directory
- The actual file location is in web/docker/docker-compose.yml

**Solution**:
- Updated morphbox-start to use correct path: `cd "$SCRIPT_DIR/web/docker"`
- This allows the container to start properly and run auto-updates

**Files Modified**:
- `morphbox-start` - Fixed docker compose directory path

### Fix TaskRunner Panel Blank Screen Issue

**Problem**:
- TaskRunner panel was showing a completely black/blank screen
- The panel was not visible regardless of theme settings

**Root Cause**:
- Hardcoded dark background colors (`#1e1e1e`, `#252526`) instead of CSS variables
- TypeScript error with null `startTime` in `formatDuration` call

**Solution**:
- Replaced all hardcoded background colors with CSS variables (`var(--bg-color)`)
- Fixed TypeScript error by adding null check for `startTime`
- Added consistent background colors to all containers
- Added debug logging for troubleshooting

**Files Modified**:
- `web/src/lib/panels/TaskRunner/TaskRunner.svelte` - Fixed styling and TypeScript issues

## 2025-01-06

### DEFINITIVE Fix for Workspace Directory Mounting

**Root Cause Identified & Fixed**:
- The Node.js wrapper was changing the working directory to morphbox installation directory before spawning the bash script
- This caused all subsequent `pwd` calls to return the morphbox directory instead of the user's directory

**The Solution**:
- Removed the `cwd: morphboxHome` option from the spawn call in `bin/morphbox.js`
- Now the bash script runs in the user's current directory, preserving the correct workspace mount

**Previous Attempts (that were incomplete)**:
- Added `INITIAL_PWD` capture (good, but was capturing after cwd change)
- Set `MORPHBOX_USER_DIR` environment variable (good, but wasn't the only issue)
- Fixed prepare-package script (necessary for deployment)

**Files Modified**:
- `web/bin/morphbox.js` - Removed cwd option that was changing directory
- `web/scripts/morphbox-start-packaged` - Uses INITIAL_PWD and MORPHBOX_USER_DIR
- `web/prepare-package.sh` - Ensures correct package installation

### Automatic Version Increment on Git Merge

**New Feature**:
- Added automatic version increment (0.0.1) after every git merge
- Implemented as a git post-merge hook for reliability
- Automatically updates package.json and package-lock.json
- Automatically updates CHANGELOG.md with version bump entry
- Creates a commit with the version change after merge

**Implementation Details**:
- Created `scripts/setup-version-bump-hook.sh` to install the git hook
- Git hook runs automatically after successful merges
- Version increments the patch number (e.g., 0.8.2 → 0.8.3)
- Hook can be disabled by deleting `.git/hooks/post-merge`

**Usage**:
- Run `./scripts/setup-version-bump-hook.sh` to enable (already done)
- The hook will trigger automatically on `git merge` and `git pull`
- To disable: `rm .git/hooks/post-merge`

### Port Fallback Functionality

**New Feature**:
- Added automatic port fallback when default ports (8008 and 8009) are in use
- Web server will automatically find the next available port if 8008 is occupied
- WebSocket server will automatically find the next available port if 8009 is occupied
- Console output clearly indicates when fallback ports are being used
- Prevents application crashes due to "EADDRINUSE" errors

**Implementation Details**:
- Created `port-utils.ts` with utilities for checking port availability
- Updated `server.js` to use async port allocation with fallback
- Updated `websocket-server.ts` to check for available ports before binding
- Vite dev server already has built-in fallback, enabled with `strictPort: false`

**Files Modified**:
- `web/src/lib/server/port-utils.ts` - New utility functions
- `web/server.js` - Updated to use port fallback
- `web/src/lib/server/websocket-server.ts` - Updated to use port fallback
- `web/vite.config.ts` - Enabled Vite's built-in port fallback

## 2025-01-05

### Version 0.8.2 - Claude Auto-Update Restored

**Changes**:
- Bumped version from 0.7.1 to 0.8.2
- Re-enabled Claude Code auto-update check on morphbox launch
- Fixed the auto-update functionality that was previously commented out in the packaged version
- Auto-update still runs automatically via docker-entrypoint.sh on container startup

## 2024-07-26

### Comprehensive Documentation Update

**Documentation Added**:
- **FEATURES.md**: Complete feature list and capabilities overview
- **USER_MANUAL.md**: Detailed user guide covering all functionality
- **API_REFERENCE.md**: Complete API documentation for developers
- **QUICK_REFERENCE.md**: Quick command and shortcut reference
- **docs/README.md**: Documentation index and overview

**Documentation Updated**:
- Updated web docs homepage with current features
- Refreshed feature descriptions to match v0.7.1
- Added .morph file format documentation
- Included mobile usage guides

---

### Added .morph File Format for Custom Panels

**New Features**:
- **Portable Panel Format**: Single `.morph` file contains code, metadata, and prompt history
- **Export Functionality**: Export any custom panel as a `.morph` file for sharing
- **Import Functionality**: Import `.morph` files from the community
- **Version Tracking**: Automatic version incrementing when panels are modified
- **Backward Compatibility**: Continues to support legacy `.js` and `.json` panel formats

**Implementation Details**:
- Created `MorphFileFormat` TypeScript interface for type safety
- Updated all API endpoints to handle both `.morph` and legacy formats
- Added export button to each custom panel in the Panel Manager
- Added import button to the Custom Panels header
- Handles ID conflicts during import by auto-generating unique IDs

**Files Added**:
- `web/src/lib/types/morph.ts` - Type definitions
- `web/src/routes/api/custom-panels/code/[id]/+server.ts` - Code loading endpoint
- `web/src/routes/api/custom-panels/export/[id]/+server.ts` - Export endpoint
- `web/src/routes/api/custom-panels/import/+server.ts` - Import endpoint

**Files Modified**:
- Updated all custom panel API endpoints for .morph support
- Enhanced PanelManager UI with import/export buttons
- Modified CustomPanelRenderer to load from new endpoints

---

## 2024-07-24

### Fixed Custom Panel Execution Issues

**Problems Solved**:
1. **Panels Not Executing**: Custom panels were showing blank with only "view source" button
2. **JavaScript Syntax Errors**: "Unexpected token '&'" due to HTML entity encoding
3. **Claude CLI Timeouts**: Panel generation failing after 30-60 seconds
4. **Fallback Content**: Panels showing placeholder content instead of using Claude

**Solutions**:
1. **Script Execution**: Switched from blob URLs to srcdoc for proper script execution in iframes
2. **Entity Encoding**: Fixed by escaping `</script>` tags in template literals
3. **Directory Isolation**: Create dedicated temp directory for each Claude invocation
4. **No Fallback Policy**: Panels now require Claude or fail with proper error

**Result**: Custom panels now execute their code properly and Claude integration works reliably.

---

## 2024-07-23

### NPM Package Distribution

**Features Added**:
- Package published as `morphbox` v0.7.1
- Global installation: `npm install -g morphbox`
- NPX support: `npx morphbox`
- Cleaned up unused files and test routes
- Created proper npm package structure

---

## 2024-07-22

### Fixed Terminal Loading Issues

**Problem**: Terminal was stuck at "MorphBox Terminal v2.0.0 Launching Claude..." and Claude wouldn't display properly.

**Root Causes**:
1. Component lifecycle issues - Terminal components were being destroyed and recreated when layout loaded from server
2. MutationObserver error during component destruction due to null reference
3. WebSocket connections closing prematurely 
4. Multiple simultaneous WebSocket connections being created
5. Event listeners not being properly cleaned up

**Solutions Implemented**:
1. **Fixed Component Recreation**: Modified `loadLayoutFromServer()` in RowLayout.svelte to update existing panels instead of clearing and recreating them
2. **Fixed MutationObserver Error**: Added null checks for `terminalContainer?.getBoundingClientRect()` 
3. **Fixed Event Listener Cleanup**: Stored references to event handlers for proper removal during cleanup
4. **Fixed WebSocket Duplicates**: Added guard to prevent multiple simultaneous WebSocket connections
5. **Fixed Persistent SSH Agent**: Changed docker exec from `-it` to `-t` flag
6. **Fixed Prop Warnings**: Added missing props to Claude and Terminal components
7. **Added Accessibility**: Added id/name attributes to xterm helper textarea

**Files Modified**:
- web/src/lib/Terminal.svelte
- web/src/lib/RowLayout.svelte  
- web/src/lib/Claude.svelte
- web/src/lib/server/persistent-session-manager.ts
- web/src/lib/server/websocket.ts
- web/src/lib/server/agents/persistent-ssh-agent.ts

**Result**: Claude now loads and displays properly in the terminal without component lifecycle issues or WebSocket disconnections.

---

## Previous Updates

(See git history for earlier changes)2025-09-09 - Fixed prompt queue detection for Claude readiness and websocket connection issues
