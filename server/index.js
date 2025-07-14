import express from 'express';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { StateManager } from './state/manager.js';
import { MCPServer } from './api/mcp-server.js';
import { AgentManager } from './agents/manager.js';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 8008;
const WS_PORT = process.env.WS_PORT || 8009;

// Initialize Express app
const app = express();
app.use(express.json());

// Initialize HTTP server
const server = createServer(app);

// Initialize WebSocket server
const wss = new WebSocketServer({ port: WS_PORT });

// Initialize managers
const stateManager = new StateManager();
const agentManager = new AgentManager();
const mcpServer = new MCPServer(wss, stateManager, agentManager);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    version: '2.0.0',
    services: {
      websocket: wss.clients.size,
      agents: agentManager.getActiveAgents().length
    }
  });
});

// API endpoints
app.get('/api/state', async (req, res) => {
  const state = await stateManager.getCurrentState();
  res.json(state);
});

app.post('/api/agents/launch', async (req, res) => {
  const { agentType, args } = req.body;
  try {
    const agentId = await agentManager.launchAgent(agentType, args);
    res.json({ success: true, agentId });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Serve static files from web build
app.use(express.static(path.join(__dirname, '../web/build')));

// Catch-all to serve SvelteKit app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../web/build/index.html'));
});

// Start services
async function start() {
  try {
    await stateManager.initialize();
    console.log(chalk.green('✓ State manager initialized'));
    
    await agentManager.initialize();
    console.log(chalk.green('✓ Agent manager initialized'));
    
    await mcpServer.initialize();
    console.log(chalk.green('✓ MCP server initialized'));
    
    server.listen(PORT, () => {
      console.log(chalk.blue(`\n🚀 MorphBox server running on http://localhost:${PORT}`));
      console.log(chalk.blue(`🔌 WebSocket server running on ws://localhost:${WS_PORT}\n`));
    });
  } catch (error) {
    console.error(chalk.red('Failed to start server:'), error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log(chalk.yellow('\nShutting down gracefully...'));
  await agentManager.stopAllAgents();
  await stateManager.close();
  server.close();
  wss.close();
  process.exit(0);
});

start();