
<svelte:head>
  <title>Terminal Persistence - MorphBox Documentation</title>
</svelte:head>

# Terminal Persistence

MorphBox terminals continue running even when you close your browser, switch tabs, or disconnect from the network. This is perfect for long-running tasks, todo lists, or any process you want to keep alive.

## How It Works

MorphBox uses GNU Screen to create persistent terminal sessions that run in the background. When you reconnect, you'll see the recent output and can continue exactly where you left off.

## Key Features

### Automatic Persistence
- All terminal and Claude panels are persistent by default
- Sessions survive browser restarts, tab switches, and network disconnections
- Session IDs stored in localStorage for automatic reconnection

### Session Management
- View all active sessions in the Session Manager panel
- See session status, creation time, and last activity
- Kill sessions you no longer need
- Auto-refresh every 10 seconds

### Reconnection Experience
- Automatic reconnection to existing sessions
- Shows recent output when reconnecting
- Maintains terminal state and running processes

## Using Persistent Sessions

### Creating a Session
Simply open a terminal or Claude panel - it's automatically persistent!

### Reconnecting
When you return to MorphBox, terminals automatically reconnect to their sessions:
1. The terminal shows "Reconnecting to session..."
2. Recent output is displayed
3. You can continue working immediately

### Managing Sessions
Add a Session Manager panel to view and manage all sessions:
- Green indicator: Active session
- Yellow indicator: Detached session  
- Red indicator: Dead session
- Click "Kill Session" to terminate

## Best Practices

### Long-Running Tasks
Perfect for:
- Development servers (`npm run dev`)
- Build processes
- Data processing
- Todo lists and task tracking

### Session Naming
Sessions are automatically named with format: `morphbox-[unique-id]`

### Resource Management
- Kill unused sessions to free resources
- Sessions persist in the Docker container
- Use Session Manager to monitor active sessions

## Technical Details

### Implementation
- Uses GNU Screen for session management
- Automatic Screen installation if not present
- Sessions run in detached mode
- Health checks every 30 seconds

### Session Storage
- Session IDs in browser localStorage
- Processes run in Docker container
- Survives container restarts with volume persistence

### Limitations
- Sessions tied to Docker container lifecycle
- Maximum session duration depends on container uptime
- Screen output buffer has size limits

## Troubleshooting

### Session Not Reconnecting
1. Check if session still exists in Session Manager
2. Clear browser cache and reload
3. Verify Docker container is running

### Can't Create New Sessions
1. Check Docker container resources
2. Kill old unused sessions
3. Restart MorphBox if needed

### Session Output Missing
- Screen buffer may be full
- Use `screen -r morphbox-[id]` to access directly
- Check Session Manager for session status