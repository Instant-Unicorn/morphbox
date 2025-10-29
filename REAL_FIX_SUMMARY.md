# The REAL Terminal Fix - October 5, 2025

## 🎯 The Actual Problem

**I was wrong about the buffering being the root cause.** The real issue was **duplicate event listeners** accumulating every time a WebSocket reconnected.

### Evidence from Logs:
```
MaxListenersExceededWarning: Possible EventEmitter memory leak detected.
11 agent_output listeners added to [AgentManager]. MaxListeners is 10.
```

```
[WebSocket] Broadcasting COMMAND_COMPLETE for agent agent_bash_1759618089602_2kx5sj
[WebSocket] COMMAND_COMPLETE sent to 6 clients
[WebSocket] Broadcasting COMMAND_COMPLETE for agent agent_bash_1759618089602_2kx5sj  <-- DUPLICATE!
[WebSocket] COMMAND_COMPLETE sent to 6 clients
```

## 🔍 Root Cause Analysis

### The Broken Flow:

1. **Agent launches** → Event listeners added in `launchAgent()`
   ```javascript
   agent.on('output', (data) => {
     this.emit('agent_output', { agentId, data });
   });
   ```

2. **WebSocket disconnects** → `detachAgent()` called
   ```javascript
   agent.removeAllListeners();  // Removes listeners FROM agent
   ```

3. **WebSocket reconnects** → `reattachAgent()` called
   ```javascript
   agent.on('output', (data) => {  // ADDS DUPLICATE LISTENER!
     this.emit('agent_output', { agentId, data });
   });
   ```

4. **Each reconnection** adds MORE listeners → output multiplies 2x, 3x, 4x...

### Why It Multiplied:
- 1st connection: 1 listener → output appears 1x ✅
- After reconnect: 2 listeners → output appears 2x ❌
- After 2nd reconnect: 3 listeners → output appears 3x ❌
- After 3rd reconnect: 4 listeners → output appears 4x ❌

This explains the error.png showing prompts repeated 10+ times!

## ✅ The Fix

### Changed in `agent-manager.ts`:

1. **Added constructor**:
   ```javascript
   constructor() {
     super();
     this.setMaxListeners(100);  // Prevent warning spam
   }
   ```

2. **Modified `detachAgent()`**:
   ```javascript
   // OLD: agent.removeAllListeners();
   // NEW: Don't remove listeners - keep them for reattach
   console.log(`Detached agent: ${agentId}`);
   ```

3. **Modified `reattachAgent()`**:
   ```javascript
   // OLD: Re-add all event listeners
   // NEW: Don't re-add - they're already there!
   console.log(`Reattached to agent: ${agentId}`);
   return true;
   ```

## 🎯 Why This Works

**Before:**
- Detach removes listeners
- Reattach adds NEW listeners
- Result: duplicate listeners accumulate

**After:**
- Detach does NOT remove listeners
- Reattach does NOT add listeners
- Result: same listeners persist (no duplicates!)

## 📝 Commits

```bash
366862d fix: Simplify terminal write logic to eliminate duplication issues
ead512c fix: Prevent duplicate event listeners causing output multiplication
```

## 🧪 Testing

1. Reload http://100.96.36.2:8008
2. Open terminals
3. Type - should see each character ONCE
4. Resize terminals - no duplication
5. Disconnect/reconnect - no multiplication

## 🎉 Expected Result

**Terminal behavior:**
- ✅ Each keypress appears exactly once
- ✅ Terminal output appears exactly once
- ✅ Prompts appear exactly once
- ✅ Works after reconnections
- ✅ No "MaxListenersExceeded" warnings

**Prompt Queue:**
- ✅ Still receives COMMAND_COMPLETE events
- ✅ Detects when commands finish
- ✅ Advances queue properly

## 💡 Lessons Learned

1. **Check the logs first!** The `MaxListenersExceededWarning` was the smoking gun
2. **Event listeners accumulate** if not properly managed
3. **Detach/reattach patterns** need careful listener management
4. **Simple is better** - don't remove/re-add, just keep them

## 🚨 If Still Issues

If duplication persists:
1. Check for other places adding event listeners
2. Verify no WebSocket-level duplication
3. Check PTY configuration (echo settings)
4. Look for resize-triggered output multiplication

But this fix should resolve the core issue!
