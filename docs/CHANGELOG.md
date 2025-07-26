# MorphBox Changelog

## 2025-07-26

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

## 2025-07-24

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

## 2025-07-23

### NPM Package Distribution

**Features Added**:
- Package published as `morphbox` v0.7.1
- Global installation: `npm install -g morphbox`
- NPX support: `npx morphbox`
- Cleaned up unused files and test routes
- Created proper npm package structure

---

## 2025-07-22

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

(See git history for earlier changes)