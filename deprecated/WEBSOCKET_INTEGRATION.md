# WebSocket Integration for MorphBox

This document describes how to use the WebSocket integration in the MorphBox web application.

## Architecture

The WebSocket integration consists of:

1. **WebSocket Server** (`src/lib/server/websocket-server.ts`) - Standalone WebSocket server that runs on port 8009
2. **Agent Manager** (`src/lib/server/agent-manager.ts`) - Manages Claude agent processes
3. **State Manager** (`src/lib/server/state-manager.ts`) - Manages session state and history using SQLite
4. **WebSocket Handler** (`src/lib/server/websocket.ts`) - Handles WebSocket message protocol
5. **WebSocket Client** (`src/lib/websocket.ts`) - Client-side WebSocket connection manager

## Running the Application

To run the full application with WebSocket support:

1. **Start the WebSocket server** (in one terminal):
   ```bash
   npm run dev:ws
   ```

2. **Start the SvelteKit development server** (in another terminal):
   ```bash
   npm run dev
   ```

The WebSocket server will run on `ws://localhost:8009` and the web application on `http://localhost:8008`.

## WebSocket Protocol

### Client → Server Messages

#### Create Session
```json
{
  "type": "CREATE_SESSION",
  "payload": {
    "workspacePath": "/path/to/workspace",
    "agentType": "claude"
  }
}
```

#### Launch Agent
```json
{
  "type": "LAUNCH_AGENT",
  "payload": {
    "type": "claude",
    "workspacePath": "/path/to/workspace"
  }
}
```

#### Send Input to Agent
```json
{
  "type": "SEND_INPUT",
  "payload": {
    "input": "your command here"
  }
}
```

#### Stop Agent
```json
{
  "type": "STOP_AGENT"
}
```

#### Get Current State
```json
{
  "type": "GET_STATE"
}
```

#### Create Snapshot
```json
{
  "type": "CREATE_SNAPSHOT",
  "payload": {
    "name": "snapshot-name",
    "description": "Snapshot description"
  }
}
```

### Server → Client Messages

#### State Update
```json
{
  "type": "STATE_UPDATE",
  "payload": {
    "activeSessions": [...],
    "recentCommands": [...],
    "totalSessions": 1,
    "activeAgents": [...],
    "currentSessionId": "session_123",
    "currentAgentId": "agent_456"
  }
}
```

#### Session Created
```json
{
  "type": "SESSION_CREATED",
  "payload": {
    "sessionId": "session_123"
  }
}
```

#### Agent Launched
```json
{
  "type": "AGENT_LAUNCHED",
  "payload": {
    "agentId": "agent_456"
  }
}
```

#### Agent Output
```json
{
  "type": "AGENT_OUTPUT",
  "payload": {
    "data": "output from agent"
  }
}
```

#### Agent Error
```json
{
  "type": "AGENT_ERROR",
  "payload": {
    "error": "error message"
  }
}
```

#### Agent Exit
```json
{
  "type": "AGENT_EXIT",
  "payload": {
    "code": 0
  }
}
```

#### Error
```json
{
  "type": "ERROR",
  "payload": {
    "message": "error description"
  }
}
```

## Using the WebSocket Client

### Basic Usage

```typescript
import { WebSocketClient } from '$lib/websocket';

// Create client
const wsClient = new WebSocketClient({
  url: 'ws://localhost:8009',
  reconnect: true,
  reconnectDelay: 3000
});

// Set up event handlers
wsClient.onOpen(() => {
  console.log('Connected');
});

wsClient.onMessage((data) => {
  const message = JSON.parse(data);
  console.log('Received:', message);
});

wsClient.onError((error) => {
  console.error('Error:', error);
});

wsClient.onClose(() => {
  console.log('Disconnected');
});

// Connect
wsClient.connect();

// Send messages
wsClient.send(JSON.stringify({
  type: 'CREATE_SESSION',
  payload: {
    workspacePath: '/tmp/workspace',
    agentType: 'claude'
  }
}));

// Disconnect when done
wsClient.disconnect();
```

### Example Component

See `src/lib/WebSocketExample.svelte` for a complete example of how to use the WebSocket client in a Svelte component.

## Production Deployment

For production deployment with the Node adapter:

1. Build the application:
   ```bash
   npm run build
   ```

2. The built application will handle WebSocket connections automatically through the Node adapter.

3. Set environment variables:
   - `WS_PORT` - WebSocket server port (default: 8009)
   - `PORT` - HTTP server port (default: 3000)

4. Run the production server:
   ```bash
   node build
   ```

## Database

The state manager uses SQLite to persist:
- Sessions
- Command history
- File changes
- Workspace snapshots

The database file is stored at `data/morphbox.db` relative to the web directory.

## Security Considerations

1. **Authentication**: The current implementation does not include authentication. Add authentication middleware before using in production.

2. **Input Validation**: All user inputs should be validated and sanitized.

3. **Process Isolation**: Agent processes should run in isolated environments.

4. **Rate Limiting**: Implement rate limiting to prevent abuse.

5. **CORS**: Configure CORS appropriately for your deployment environment.