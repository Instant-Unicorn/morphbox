import { EventEmitter } from 'events';
import chalk from 'chalk';

export class MCPServer extends EventEmitter {
  constructor(wss, stateManager, agentManager) {
    super();
    this.wss = wss;
    this.stateManager = stateManager;
    this.agentManager = agentManager;
    this.clients = new Map();
  }

  async initialize() {
    this.wss.on('connection', (ws, req) => {
      const clientId = `client_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const client = {
        id: clientId,
        ws,
        sessionId: null,
        agentId: null
      };

      this.clients.set(clientId, client);
      console.log(chalk.cyan(`Client connected: ${clientId}`));

      // Send welcome message
      this.sendToClient(clientId, {
        type: 'welcome',
        clientId,
        version: '2.0.0'
      });

      // Handle messages
      ws.on('message', async (data) => {
        try {
          const message = JSON.parse(data.toString());
          await this.handleMessage(clientId, message);
        } catch (error) {
          console.error(chalk.red(`Error handling message from ${clientId}:`), error);
          this.sendToClient(clientId, {
            type: 'error',
            error: error.message
          });
        }
      });

      // Handle disconnect
      ws.on('close', () => {
        console.log(chalk.yellow(`Client disconnected: ${clientId}`));
        this.handleDisconnect(clientId);
      });

      ws.on('error', (error) => {
        console.error(chalk.red(`WebSocket error for ${clientId}:`), error);
      });
    });
  }

  async handleMessage(clientId, message) {
    const client = this.clients.get(clientId);
    
    switch (message.type) {
      case 'start_session':
        await this.handleStartSession(clientId, message);
        break;
        
      case 'execute_command':
        await this.handleExecuteCommand(clientId, message);
        break;
        
      case 'agent_output':
        await this.handleAgentOutput(clientId, message);
        break;
        
      case 'file_change':
        await this.handleFileChange(clientId, message);
        break;
        
      case 'create_snapshot':
        await this.handleCreateSnapshot(clientId, message);
        break;
        
      case 'get_history':
        await this.handleGetHistory(clientId, message);
        break;
        
      default:
        console.warn(chalk.yellow(`Unknown message type: ${message.type}`));
    }
  }

  async handleStartSession(clientId, message) {
    const { workspacePath, agentType = 'claude' } = message;
    const client = this.clients.get(clientId);

    // Create session in database
    const sessionId = await this.stateManager.createSession(workspacePath, agentType);
    client.sessionId = sessionId;

    // Launch agent
    const agentId = await this.agentManager.launchAgent(agentType, {
      sessionId,
      workspacePath,
      onOutput: (output) => this.handleAgentOutput(clientId, { output }),
      onError: (error) => this.sendToClient(clientId, { type: 'agent_error', error })
    });

    client.agentId = agentId;

    this.sendToClient(clientId, {
      type: 'session_started',
      sessionId,
      agentId
    });
  }

  async handleExecuteCommand(clientId, message) {
    const { command } = message;
    const client = this.clients.get(clientId);

    if (!client.agentId) {
      throw new Error('No active agent for this client');
    }

    // Send command to agent
    const result = await this.agentManager.sendToAgent(client.agentId, command);

    // Log command to database
    await this.stateManager.logCommand(
      client.sessionId,
      command,
      result.output,
      result.error
    );

    this.sendToClient(clientId, {
      type: 'command_result',
      command,
      output: result.output,
      error: result.error
    });
  }

  async handleAgentOutput(clientId, message) {
    const { output } = message;
    
    // Broadcast agent output to client
    this.sendToClient(clientId, {
      type: 'agent_output',
      output
    });
  }

  async handleFileChange(clientId, message) {
    const { filePath, action, content } = message;
    const client = this.clients.get(clientId);

    if (client.sessionId) {
      await this.stateManager.trackFileChange(
        client.sessionId,
        filePath,
        action,
        content
      );
    }

    // Broadcast file change to other clients
    this.broadcast({
      type: 'file_changed',
      filePath,
      action
    }, clientId);
  }

  async handleCreateSnapshot(clientId, message) {
    const { name, description } = message;
    const client = this.clients.get(clientId);

    if (!client.sessionId) {
      throw new Error('No active session');
    }

    const snapshotId = await this.stateManager.createSnapshot(
      client.sessionId,
      name,
      description
    );

    this.sendToClient(clientId, {
      type: 'snapshot_created',
      snapshotId,
      name
    });
  }

  async handleGetHistory(clientId, message) {
    const client = this.clients.get(clientId);

    if (!client.sessionId) {
      throw new Error('No active session');
    }

    const history = await this.stateManager.getSessionHistory(client.sessionId);

    this.sendToClient(clientId, {
      type: 'history',
      history
    });
  }

  handleDisconnect(clientId) {
    const client = this.clients.get(clientId);
    
    if (client && client.agentId) {
      // Stop agent if client disconnects
      this.agentManager.stopAgent(client.agentId);
    }

    this.clients.delete(clientId);
  }

  sendToClient(clientId, message) {
    const client = this.clients.get(clientId);
    
    if (client && client.ws.readyState === 1) {
      client.ws.send(JSON.stringify(message));
    }
  }

  broadcast(message, excludeClientId = null) {
    this.clients.forEach((client, clientId) => {
      if (clientId !== excludeClientId && client.ws.readyState === 1) {
        client.ws.send(JSON.stringify(message));
      }
    });
  }
}