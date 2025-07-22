# Terminal Component Fixes Summary

## Issues Fixed

1. **MutationObserver Error During Component Destruction**
   - Added null checks for `terminalContainer?.getBoundingClientRect()` to prevent errors when component is destroyed
   - Added safety check before calling `mutationObserver.observe()` to ensure container exists

2. **Event Listener Cleanup Issues**
   - Fixed window resize and orientationchange event listeners not being properly cleaned up
   - Stored references to event handlers for proper removal during component cleanup
   - Added logging to cleanup function for debugging

3. **Component Recreation on Layout Load**
   - Modified `loadLayoutFromServer()` in RowLayout.svelte to update existing panels instead of clearing and recreating them
   - This prevents Terminal components from being destroyed and recreated when the layout loads from the server
   - Now checks if panels already exist and updates their properties rather than destroying them

4. **Persistent SSH Agent Fixes**
   - Changed docker exec from `-it` to `-t` flag to fix PTY allocation issues
   - Fixed auto-restart logic to use correct agent configuration
   - Improved session management to prevent rapid reconnections

## Files Modified

1. `/home/kruger/projects/morphbox/web/src/lib/Terminal.svelte`
   - Added observer and event handler references for cleanup
   - Fixed MutationObserver error with null checks
   - Improved event listener cleanup

2. `/home/kruger/projects/morphbox/web/src/lib/RowLayout.svelte`
   - Modified `loadLayoutFromServer()` to update existing panels instead of recreating them
   - Prevents component destruction during layout loading

3. `/home/kruger/projects/morphbox/web/src/lib/server/persistent-session-manager.ts`
   - Fixed docker exec command flags

4. `/home/kruger/projects/morphbox/web/src/lib/server/websocket.ts`
   - Fixed auto-restart configuration for persistent SSH agents

## Result

These fixes should resolve:
- The MutationObserver error that was occurring during component destruction
- The rapid WebSocket reconnections caused by component recreation
- The terminal being stuck at "Launching Claude..." due to components being destroyed and recreated
- Memory leaks from improper event listener cleanup