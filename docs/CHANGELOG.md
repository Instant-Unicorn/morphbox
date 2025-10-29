# MorphBox Changelog

## 2025-10-29 - v1.3.0 (Multiple Terminals & Enhanced Prompt Queue)

### New Features
- **✨ Multiple Terminal Support**: Can now open unlimited Sandbox Terminals and Admin Terminals simultaneously
  - Each terminal gets unique sequential numbering (Sandbox Terminal 1, 2, 3, etc.)
  - Removed duplicate panel restrictions for terminal types
  - Updated panel manager to allow multiple instances

- **🎯 Enhanced Prompt Queue Terminal Targeting**:
  - Added "All Terminals" broadcast option - send prompts to all terminals at once
  - Restored terminal selector dropdown for each prompt
  - Smart default selection: prioritizes sandbox terminals, then admin terminals
  - Updated to recognize new sandboxTerminal and adminTerminal panel types

- **🔐 Sandboxed Parameter Implementation**: Admin terminals now correctly run on host with full system access
  - Added `sandboxed` field to `AgentOptions` interface
  - BashAgent supports both sandboxed (Docker) and host (PTY) modes
  - WebSocket server parses and passes sandboxed parameter correctly
  - Clear console warnings distinguish between modes

### Bug Fixes
- Fixed: Both terminal types were showing as sandboxed - admin terminal now runs on host as intended
- Fixed: Could only open one terminal of each type - now supports multiple instances
- Fixed: Prompt Queue wasn't recognizing new terminal types - updated filters throughout
- Fixed: Terminal targeting in Prompt Queue not working - fully restored functionality

### Technical Changes
- **agent-manager.ts**: Added `sandboxed?: boolean` to `AgentOptions`
- **bash-agent.ts**: Implemented dual-mode PTY spawning (Docker container vs host)
- **websocket.ts**: Added sandboxed parameter parsing and passing to agent launcher
- **panels.ts**: Added sandboxTerminal/adminTerminal to builtInTypes array with counters
- **PanelManager.svelte**: Updated allowMultiple array to include new terminal types
- **PromptQueue.svelte**:
  - Updated terminal filters to include sandboxTerminal/adminTerminal
  - Implemented "All Terminals" broadcast functionality
  - Added smart default terminal selection logic

### User Experience Improvements
- Terminal selector now shows individual terminals first, "All Terminals" option at bottom
- Default terminal selection prioritizes safety: sandbox first, then admin
- Clear visual distinction between terminal types in UI
- Auto-completion for "All Terminals" prompts (2 second delay)

## 2025-10-29 - v1.2.0 (Automatic Version Detection & Container Rebuild)

### New Features
- **🔄 Automatic Container Version Detection**: MorphBox now automatically detects when the npm package version doesn't match the running Docker container version
  - Adds `MORPHBOX_VERSION` build argument to Dockerfile
  - Labels container images with version metadata (`morphbox.version` label)
  - Checks version on every startup and rebuilds if mismatch detected

- **📦 Version-Specific Image Tagging**: Docker images now use version-specific tags (e.g., `morphbox:1.2.0`) in addition to `latest`
  - Prevents issues where users install new version but run old container
  - Each version builds its own image, allowing rollback if needed
  - Backwards compatible with `morphbox:latest` tag

### Problem Solved
Previously, when users installed a new version via `npm install -g morphbox`, the CLI updated but the Docker container continued running old code. This meant new features (like Admin Terminal in v1.1.2) wouldn't appear until users manually rebuilt the container.

### Solution
- On startup, morphbox reads version from `package.json`
- Compares it to the running container's image version label
- If mismatch: automatically stops old container and rebuilds with new version
- Users get features matching their installed version automatically

### Technical Changes
- **Dockerfile**: Added `MORPHBOX_VERSION` ARG and version labels
- **morphbox-start**: Added version checking logic before container creation
- **prepare-package.sh**: Builds images with version-specific tags and passes version as build arg
- Container recreation now triggered by version mismatch, not just workspace changes

### Benefits
- Zero-friction updates: install and run, container rebuilds automatically
- Version consistency: running code always matches installed package
- Better debugging: can identify which version a container is running
- Future-proof: supports version pinning and rollbacks

## 2025-10-24 - v1.1.1 (Terminal Architecture Redesign - Fixed)

### Patch Fixes (v1.1.1)
- **Fixed**: Admin Terminal in packaged mode now correctly spawns on host
  - Issue: `websocket-proxy.js` was missing the sandboxed logic, causing both terminals to run in container
  - Solution: Added sandboxed parameter handling to websocket-proxy.js
- **Fixed**: Blank space from old terminal/claude panel types in saved layouts
  - Added filtering to remove obsolete panel types when loading saved layouts
- **Changed**: Default panels now Sandbox Terminal + Prompt Queue (was just Sandbox Terminal)

### Major Architectural Change
- **🔧 BREAKING**: Replaced Terminal and Claude panels with unified dual-terminal architecture
  - **New**: Sandbox Terminal (sandboxed=true) - Safe for AI autonomy with `--dangerously-skip-permissions`
  - **New**: Admin Terminal (sandboxed=false) - Direct host access for real workflows ⚠️
  - **Removed**: Claude panel (was just a wrapper - now redundant)

### The Problem Solved
MorphBox originally ran terminals only in sandboxed containers (safe for AI), but this broke real workflows like git push, NGINX builds, and production deployments. Users had to choose between AI safety and functional workflows.

### The Solution
Two terminal types with clear purposes:
1. **Sandbox Terminal**: Runs in Docker container
   - Primary terminal for AI agents with `--dangerously-skip-permissions`
   - Contained blast radius - AI can't damage host system
   - Safe for autonomous AI operations

2. **Admin Terminal**: Runs directly on host ⚠️
   - Full system access for git operations, builds, deployments
   - Use with caution - no sandbox protection
   - Enables real workflows that require host access

### Technical Changes - Frontend
- Added `sandboxed` prop to Terminal.svelte (default: true)
- Updated panel registry with `sandboxTerminal` and `adminTerminal` entries
- Removed Claude.svelte component (was redundant wrapper)
- Updated all layouts (GridLayout, RowLayout, TerminalModeLayout)
- Updated panel renderers (GridPanel, RowPanel)
- Terminal.svelte passes `sandboxed` query param to backend

### Technical Changes - Backend (Dev Mode)
- Added `sandboxed` flag to AgentOptions interface
- Modified BashAgent to support both container and host execution
  - `sandboxed=true` (default): Spawns bash in Docker container via `docker exec`
  - `sandboxed=false`: Spawns bash directly on host with `pty.spawn('/bin/bash')`
- Updated prompt detection regex to handle both container and host prompts
- WebSocket handler parses `sandboxed` query parameter and passes to agent launch
- Added logging to clearly indicate when Admin terminals are spawned

### Technical Changes - Backend (Packaged Mode)
- Modified `websocket-proxy.js` to support Admin Terminal
  - Parses `sandboxed` query parameter from WebSocket URL
  - `sandboxed=false`: Spawns local PTY directly on host with `pty.spawn('/bin/bash')`
  - `sandboxed=true`: Uses SSH to spawn in Docker container (existing behavior)
  - Admin terminals bypass SSH entirely - true host access

### Why This Works
- FileExplorer, CodeEditor, GitPanel already talk to host (not sandboxed)
- We just exposed what was already there - no architectural rewrite
- AI gets safe autonomous environment (Sandbox Terminal)
- Engineers get functional workflows (Admin Terminal)
- Clean separation of concerns

### Documentation Updated
- MORPHBOX_PANEL_DEVELOPMENT_GUIDE.md - Updated Built-in Panels section
- CLAUDE.md - Added Terminal Architecture section with full explanation

## 2025-10-06 - v1.0.0 (Major Release) 🎉

### Major Features
- **🚀 MAJOR RELEASE**: MorphBox v1.0.0 is now production-ready!
- **Added**: Dynamic dev server port forwarding (ports 5173-5179)
  - Automatically detects available ports and only exposes those not in use
  - Supports `--local`, `--vpn`, and `--external` modes
  - Tailscale VPN integration with auto-detection
  - Smart port conflict resolution

### Breaking Changes
- **Removed**: WebBrowser panel (redundant with external browser workflow)
- **Removed**: TaskRunner panel (terminal provides better functionality)

### Improvements
- **Enhanced**: Docker container networking
  - Dev servers inside containers can now be accessed from host
  - Auto-detects which ports are available on host machine
  - Works seamlessly with Tailscale VPN setup
- **Fixed**: Empty row rendering when panels are removed
  - Added automatic cleanup of stale panel state from sessionStorage

### Technical Details
- Modified `morphbox-start` script to dynamically check port availability
- Updated `docker-compose.yml` to use MORPHBOX_HOST environment variable
- Removed panel references from `RowLayout.svelte` and `GridLayout.svelte`
- Updated panel registry to remove WebBrowser and TaskRunner entries

## 2025-10-04 - v0.13.0 (Session Persistence Complete)

### Changes
- **Version bump**: Updated package version to v0.13.0
- **Session persistence**: Feature is now merged to main branch
  - Claude panels reconnect with space-typing workaround for rendering
  - Terminal panels maintain sessions (may need keystroke to display)
  - Silent reconnection without system messages
  - 30-minute session timeout

## 2025-10-03 - v0.12.0 (Session Persistence)

### Major Features
- **Implemented**: Full session persistence for Claude and Terminal panels
  - Claude panels now reconnect to existing Claude sessions on page refresh
  - Terminal panels now reconnect to existing bash sessions on page refresh
  - Both WebSocket and terminal session IDs properly restored from localStorage
  - Sessions remain active for 30 minutes after disconnect

### Key Improvements
- **Added**: Session buffering for disconnected clients
  - Output is buffered while client is disconnected
  - Buffered output replayed on reconnection
  - Maximum buffer size of 100KB to prevent memory issues
- **Fixed**: WebSocket session restoration on mount
  - Properly restores sessionId before WebSocket connection
  - Prevents duplicate session ID lookups
  - Consistent session handling for both panel types
- **Added**: Agent detach/reattach support
  - Agents remain running when client disconnects
  - Proper cleanup of event listeners on detach
  - Re-establishes listeners on reattach

### Technical Details
- Modified `Terminal.svelte` to restore both session types on mount
- Updated `websocket.ts` to handle reconnection for regular terminals
- Session store maintains 30-minute timeout for inactive sessions
- Agent manager properly supports detach/reattach operations

## 2025-10-02 - v0.11.1 (Prompt Queue & Terminal Stability)

### Major Bug Fixes
- **Fixed**: Manage modes button in prompt queue now properly opens modal
  - Changed icon from Settings to Sliders to avoid namespace conflicts
  - Added proper modal backdrop CSS for visibility
- **Fixed**: Edit button visibility on custom panels only
  - Built-in panels no longer incorrectly show edit buttons
  - Edit button now properly opens panel editor with window events
- **Fixed**: Panel title editing functionality restored for both Grid and Row layouts
  - Implemented complete title editing with proper state management
  - Fixed icon display and edit mode toggling
- **Fixed**: Terminal preservation during drag operations
  - Added {#key panel.id} blocks to preserve component instances
  - Prevents terminal resets and process termination when dragging panels
- **Fixed**: Duplicate terminal ID generation causing app crashes
  - Rewrote ID generation logic with explicit built-in type list
  - Added migration logic to fix duplicate IDs on load
- **Fixed**: Terminal message display issues
  - Centralized all message decisions in shouldShowSystemMessage()
  - Fixed Claude terminals showing blank or reconnecting to wrong agents
  - Eliminated recurring welcome messages after reload/drag

### New Features
- **Added**: Hide mode functionality for prompt modes
  - X button now hides modes instead of deleting them
  - Delete functionality moved to manage modes modal
- **Added**: Compact mode toggle for prompt modes display
  - Option to show only emoji and color border without text
  - Toggle available in manage modes modal

### Technical Improvements
- **Changed**: Per-panel WebSocket sessions instead of global
  - Each panel maintains its own session storage
  - Prevents cross-panel session contamination
- **Changed**: Improved localStorage key namespacing
  - Terminal sessions use panel-specific keys
  - WebSocket sessions properly isolated per panel
- **Changed**: Better component lifecycle management
  - Added isReconnectingToExistingSession state tracking
  - All system messages server-driven (no mount-time messages)

## 2025-10-02 - v0.10.3 (Claude Banner Fix)

### Critical Fixes
- **Fixed**: Duplicate Claude Code startup banners appearing in terminal
  - Changed `convertEol: false` in Terminal.svelte to allow proper ANSI cursor positioning
  - Claude Code's startup animation now displays correctly without repetition
  - ANSI cursor movement sequences (`\u001b[1A`) now work as intended

### Technical Details
- The issue was caused by `convertEol: true` in xterm.js configuration
- This setting interfered with ANSI escape sequences used for cursor positioning
- Claude Code animates its startup banner by redrawing it progressively using cursor up commands
- With `convertEol` enabled, these positioning commands were broken, causing each frame to appear on a new line
- Solution: Let the PTY handle EOL conversion by setting `convertEol: false`

## 2025-10-01 - v0.10.2 (Terminal Echo & Context Window Tracking)

### Fixed
- **Fixed**: Claude and Terminal panels showing double text due to PTY echo
  - Added `stty -echo` command to bash-agent.ts and ssh-agent.ts

### Context Window Tracking
- **NEW**: Context Monitor now tracks REAL Claude context window usage
  - Parses token usage from Claude Code output (`Token usage: X/Y; Z remaining`)
  - Displays tokens used, total budget, and remaining tokens
  - Battery visualization shows context usage percentage (green=low, yellow=medium, red=high)
  - Updated to v4.0.0 with complete rewrite for token tracking

### Technical Implementation
- **Added**: `context-usage` event in ssh-agent.ts that parses token information
- **Added**: `CONTEXT_USAGE` WebSocket message type for broadcasting token data
- **Added**: Event handler in agent-manager.ts to forward context usage events
- **Added**: WebSocket handler to broadcast context updates to all connected clients

## 2025-10-01 - v0.10.3 (Critical Fixes & UX Improvements)

### Critical Fixes
- **Fixed**: Claude panel now correctly launches Claude instead of SSH agent
- **Fixed**: Vite HMR port configuration conflict causing connection errors on port 8010
- **Fixed**: CustomPanelRenderer iframe element spam with proper DOM synchronization
- **Fixed**: Custom panel deletion now handles new .morph file format correctly

### UX Improvements
- **Changed**: Default startup panels now show only Claude and Prompt Queue
- **Changed**: All default panels are now closeable (not persistent)
- **Added**: Terminal panel removed from default startup but still accessible via Panel Manager

### Technical Enhancements
- **Added**: MorphBox Global API for centralized data access in custom panels
- **Added**: `/api/custom-panels/update-code` endpoint for panel editing functionality
- **Created**: `dev-test.sh` script for streamlined development testing

## 2025-09-30 - v0.10.2 (Development Workflow Improvements)

### Custom Panel Enhancements
- **Fixed**: Custom panel deletion now works correctly without panels reappearing
- **Added**: Edit button (pencil icon) in custom panel headers for easy editing
- **Added**: Click-to-rename functionality for custom panel titles
- **Fixed**: WebSocket connection issues in custom panels (Context Manager)
- **Created**: MorphBox Global API for centralized data access across panels

### Development Workflow Streamlining
- **Added**: Direct development mode without Docker requirement
- **Added**: Hot-reload support for Svelte component changes
- **Created**: `dev-test.sh` script for rapid development testing
- **Improved**: Development servers now run directly on host machine (ports 8008-8010)
- **Fixed**: Port conflict handling for multiple server instances

### Technical Improvements
- **Enhanced**: BasePanel component now supports custom panel editing features
- **Fixed**: Event routing for custom panel edit actions
- **Added**: Panel type detection for distinguishing custom vs built-in panels
- **Improved**: WebSocket URL detection with multiple fallback options

## 2025-09-09 - v0.9.6

### Container Configuration System
- **Added**: YAML-based configuration system (`morphbox.yml`) for customizing containers
- **Added**: `morphbox --config` command to generate example configuration file
- **Added**: Support for installing custom packages in containers
- **Added**: Environment variable configuration
- **Added**: Network allowlist/blocklist for domain restrictions
- **Added**: Resource limits (memory, CPU) configuration
- **Added**: Pre-install language runtimes (Node.js, Python, Go) with specific versions
- **Added**: Custom startup scripts (post-create, pre-start)
- **Added**: Docker cleanup documentation guide

### Improvements
- **Updated**: Default ports documented correctly as 8008/8009 (not 3000-3010)
- **Fixed**: Removed tmux from default package list (was causing issues)
- **Improved**: Configuration system integrates with existing allowlist manager
- **Added**: Automatic Docker image generation based on configuration hash

### Documentation Updates
- **Added**: Docker Cleanup Guide (docs/DOCKER_CLEANUP.md)
- **Updated**: README with configuration feature documentation
- **Updated**: Corrected all port references to 8008/8009
- **Added**: Container reset instructions in troubleshooting section

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
