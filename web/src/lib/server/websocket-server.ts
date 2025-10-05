import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { handleWebSocketConnection } from './websocket';
import { AgentManager } from './agent-manager';
import { StateManager } from './state-manager';
import { getAvailablePort } from './port-utils';

const PREFERRED_PORT = parseInt(process.env.WS_PORT || '8009');
const HOST = process.env.MORPHBOX_HOST || '0.0.0.0';

// Initialize managers
const agentManager = new AgentManager();
const stateManager = new StateManager();

async function startWebSocketServer() {
  try {
    // Get available port
    const PORT = await getAvailablePort(PREFERRED_PORT, HOST);
    
    // Initialize managers
    await agentManager.initialize();
    await stateManager.initialize();
    console.log('✅ Managers initialized');

    // Create HTTP server with CORS headers
    const server = createServer((req, res) => {
      // Handle CORS for WebSocket upgrade
      res.writeHead(200, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      });
      res.end();
    });
    
    // Create WebSocket server
    const wss = new WebSocketServer({ server });

    // Global broadcast: Listen to agent output and broadcast to ALL clients
    agentManager.on('agent_output', (data: { agentId: string; data: string }) => {
      const message = JSON.stringify({
        type: 'OUTPUT',
        payload: {
          data: data.data,
          agentId: data.agentId
        }
      });

      // Broadcast to ALL connected clients
      wss.clients.forEach((client: any) => {
        if (client.readyState === 1) { // WebSocket.OPEN
          client.send(message);
        }
      });
    });

    // Broadcast command completion events
    agentManager.on('agent_command_complete', (data: { agentId: string }) => {
      console.log(`[WebSocket] Broadcasting COMMAND_COMPLETE for agent ${data.agentId}`);
      const message = JSON.stringify({
        type: 'COMMAND_COMPLETE',
        payload: {
          agentId: data.agentId
        }
      });

      // Broadcast to ALL connected clients
      let clientCount = 0;
      wss.clients.forEach((client: any) => {
        if (client.readyState === 1) { // WebSocket.OPEN
          client.send(message);
          clientCount++;
        }
      });
      console.log(`[WebSocket] COMMAND_COMPLETE sent to ${clientCount} clients`);
    });

    wss.on('connection', (ws, request) => {
      console.log('New WebSocket connection from:', request.headers.host);
      handleWebSocketConnection(ws, request, { agentManager, stateManager, wss });
    });

    // Start listening
    server.listen(PORT, HOST, () => {
      const displayHost = HOST === '0.0.0.0' ? 'all interfaces' : HOST;
      console.log(`🚀 WebSocket server running on ws://${HOST}:${PORT} (${displayHost})`);
    });

  } catch (error) {
    console.error('Failed to start WebSocket server:', error);
    process.exit(1);
  }
}

// Handle cleanup
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down WebSocket server...');
  await agentManager.stopAllAgents();
  await stateManager.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down WebSocket server...');
  await agentManager.stopAllAgents();
  await stateManager.close();
  process.exit(0);
});

// Start the server
startWebSocketServer();