# MorphBox Changelog

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