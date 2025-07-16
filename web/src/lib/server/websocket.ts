import type { WebSocket } from 'ws';
import type { IncomingMessage } from 'http';
import type { AgentManager } from './agent-manager';
import type { StateManager } from './state-manager';

interface WebSocketMessage {
  type: string;
  payload?: any;
}

interface WebSocketContext {
  agentManager: AgentManager;
  stateManager: StateManager;
}

export function handleWebSocketConnection(
  ws: WebSocket,
  request: IncomingMessage,
  context: WebSocketContext
) {
  const { agentManager, stateManager } = context;
  let currentSessionId: string | null = null;
  let currentAgentId: string | null = null;
  let terminalSessionId: string | null = null;
  
  // Extract terminal session ID and autoLaunchClaude from query params if provided
  const url = new URL(request.url || '', `http://${request.headers.host}`);
  const providedTerminalSessionId = url.searchParams.get('terminalSessionId');
  const autoLaunchClaude = url.searchParams.get('autoLaunchClaude') === 'true';

  console.log('New WebSocket connection established');
  console.log('WebSocket readyState:', ws.readyState);
  
  // Setup ping/pong to keep connection alive
  const pingInterval = setInterval(() => {
    if (ws.readyState === 1) { // OPEN state
      ws.ping();
    }
  }, 30000); // Ping every 30 seconds

  ws.on('pong', () => {
    // Connection is alive
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });

  // Send welcome message
  send('CONNECTED', { message: 'Welcome to MorphBox Terminal' });
  
  // Launch agent automatically based on type
  if (autoLaunchClaude) {
    setTimeout(async () => {
      console.log('Auto-launching Claude for WebSocket connection');
      
      try {
      // Create session
      currentSessionId = await stateManager.createSession(process.cwd(), 'claude');
      send('SESSION_CREATED', { sessionId: currentSessionId });
      
      // Get VM connection info from environment
      const vmHost = process.env.MORPHBOX_VM_HOST || '127.0.0.1';
      const vmPort = parseInt(process.env.MORPHBOX_VM_PORT || '22');
      const vmUser = process.env.MORPHBOX_VM_USER || 'morphbox';
      
      // Launch SSH connection to VM
      console.log('Launching SSH agent with config:', { vmHost, vmPort, vmUser });
      currentAgentId = await agentManager.launchAgent('ssh', {
        sessionId: currentSessionId,
        terminalSessionId: providedTerminalSessionId || undefined,
        vmHost,
        vmPort,
        vmUser
      });
      console.log('SSH agent launched with ID:', currentAgentId);

      // Set up agent event listeners
      const handleOutput = (data: { agentId: string; data: string }) => {
        if (data.agentId === currentAgentId) {
          send('OUTPUT', { data: data.data });
        }
      };

      const handleError = (data: { agentId: string; error: string }) => {
        if (data.agentId === currentAgentId) {
          send('ERROR', { message: data.error });
        }
      };

      const handleExit = (data: { agentId: string; code: number }) => {
        if (data.agentId === currentAgentId) {
          send('AGENT_EXIT', { code: data.code });
          currentAgentId = null;
          
          // Clean up listeners
          agentManager.off('agent_output', handleOutput);
          agentManager.off('agent_error', handleError);
          agentManager.off('agent_exit', handleExit);
          agentManager.off('agent_sessionId', handleSessionId);
          
          // Auto-restart SSH connection if it exits
          setTimeout(() => {
            if (!currentAgentId && ws.readyState === 1) {
              handleLaunchAgent({ type: 'ssh' });
            }
          }, 1000);
        }
      };

      const handleSessionId = (data: { agentId: string; sessionId: string }) => {
        if (data.agentId === currentAgentId) {
          terminalSessionId = data.sessionId;
          send('TERMINAL_SESSION_ID', { sessionId: data.sessionId });
        }
      };

      agentManager.on('agent_output', handleOutput);
      agentManager.on('agent_error', handleError);
      agentManager.on('agent_exit', handleExit);
      agentManager.on('agent_sessionId', handleSessionId);

      send('AGENT_LAUNCHED', { agentId: currentAgentId });
      await sendCurrentState();
    } catch (error) {
      console.error('Failed to launch Claude:', error);
      let errorMessage = 'Unknown error';
      if (error instanceof Error) {
        errorMessage = error.message;
        // Clean up any Node.js-specific error details that might contain 'require'
        errorMessage = errorMessage.replace(/require\s+is\s+not\s+defined/gi, 'Module loading error');
      }
      sendError('Failed to launch Claude: ' + errorMessage);
    }
  }, 100);
  } else {
    // Launch bash automatically for regular terminals
    setTimeout(async () => {
      console.log('Auto-launching bash for terminal connection');
      
      try {
        // Create session
        currentSessionId = await stateManager.createSession(process.cwd(), 'bash');
        send('SESSION_CREATED', { sessionId: currentSessionId });
        
        // Launch bash agent
        currentAgentId = await agentManager.launchAgent('bash', {
          sessionId: currentSessionId,
          workspacePath: process.cwd()
        });
        
        // Set up agent event listeners
        const handleOutput = (data: { agentId: string; data: string }) => {
          if (data.agentId === currentAgentId) {
            send('OUTPUT', { data: data.data });
          }
        };

        const handleError = (data: { agentId: string; error: string }) => {
          if (data.agentId === currentAgentId) {
            send('ERROR', { message: data.error });
          }
        };

        const handleExit = (data: { agentId: string; code: number }) => {
          if (data.agentId === currentAgentId) {
            send('AGENT_EXIT', { code: data.code });
            currentAgentId = null;
            
            // Clean up listeners
            agentManager.off('agent_output', handleOutput);
            agentManager.off('agent_error', handleError);
            agentManager.off('agent_exit', handleExit);
          }
        };

        agentManager.on('agent_output', handleOutput);
        agentManager.on('agent_error', handleError);
        agentManager.on('agent_exit', handleExit);

        send('AGENT_LAUNCHED', { agentId: currentAgentId });
        await sendCurrentState();
      } catch (error) {
        console.error('Failed to launch bash:', error);
        sendError('Failed to launch terminal');
      }
    }, 100);
  }

  // Handle incoming messages
  ws.on('message', async (data) => {
    try {
      const message = JSON.parse(data.toString()) as WebSocketMessage;
      
      switch (message.type) {
        case 'CREATE_SESSION':
          await handleCreateSession(message.payload);
          break;
          
        case 'LAUNCH_AGENT':
          await handleLaunchAgent(message.payload);
          break;
          
        case 'SEND_INPUT':
          await handleSendInput(message.payload);
          break;
          
        case 'STOP_AGENT':
          await handleStopAgent();
          break;
          
        case 'GET_STATE':
          await sendCurrentState();
          break;
          
        case 'CREATE_SNAPSHOT':
          await handleCreateSnapshot(message.payload);
          break;
          
        case 'RESIZE':
          await handleResize(message.payload);
          break;
          
        default:
          sendError(`Unknown message type: ${message.type}`);
      }
    } catch (error) {
      console.error('Error handling WebSocket message:', error);
      sendError(error instanceof Error ? error.message : 'Unknown error');
    }
  });

  // Handle connection close
  ws.on('close', async () => {
    console.log('WebSocket connection closed');
    
    // Clear ping interval
    clearInterval(pingInterval);
    
    // Clean up agent if one is running
    if (currentAgentId) {
      try {
        await agentManager.stopAgent(currentAgentId);
      } catch (error) {
        console.error('Error stopping agent on disconnect:', error);
      }
    }
  });

  // Helper functions
  function send(type: string, payload?: any) {
    // WebSocket.OPEN is 1
    if (ws.readyState === 1) {
      const message = JSON.stringify({ type, payload });
      console.log('Sending message:', type);
      ws.send(message);
    } else {
      console.log('Cannot send message, WebSocket not open. State:', ws.readyState);
    }
  }

  function sendError(message: string) {
    send('ERROR', { message });
  }

  async function sendCurrentState() {
    try {
      const state = await stateManager.getCurrentState();
      const activeAgents = agentManager.getActiveAgents();
      
      send('STATE_UPDATE', {
        ...state,
        activeAgents,
        currentSessionId,
        currentAgentId
      });
    } catch (error) {
      sendError('Failed to get current state');
    }
  }

  async function handleCreateSession(payload: any) {
    const { workspacePath, agentType } = payload;
    
    if (!workspacePath || !agentType) {
      sendError('Missing required fields: workspacePath, agentType');
      return;
    }

    try {
      currentSessionId = await stateManager.createSession(workspacePath, agentType);
      send('SESSION_CREATED', { sessionId: currentSessionId });
      await sendCurrentState();
    } catch (error) {
      sendError('Failed to create session');
    }
  }

  async function handleLaunchAgent(payload: any) {
    const { type = 'claude' } = payload;
    
    if (!currentSessionId) {
      sendError('No active session. Create a session first.');
      return;
    }

    try {
      currentAgentId = await agentManager.launchAgent(type, {
        sessionId: currentSessionId,
        workspacePath: payload.workspacePath
      });

      // Set up agent event listeners
      const handleOutput = (data: { agentId: string; data: string }) => {
        if (data.agentId === currentAgentId) {
          send('OUTPUT', { data: data.data });
        }
      };

      const handleError = (data: { agentId: string; error: string }) => {
        if (data.agentId === currentAgentId) {
          send('ERROR', { message: data.error });
        }
      };

      const handleExit = (data: { agentId: string; code: number }) => {
        if (data.agentId === currentAgentId) {
          send('AGENT_EXIT', { code: data.code });
          currentAgentId = null;
          
          // Clean up listeners
          agentManager.off('agent_output', handleOutput);
          agentManager.off('agent_error', handleError);
          agentManager.off('agent_exit', handleExit);
        }
      };

      agentManager.on('agent_output', handleOutput);
      agentManager.on('agent_error', handleError);
      agentManager.on('agent_exit', handleExit);
      // Note: handleSessionId is not needed here since it's only used in the initial launch

      send('AGENT_LAUNCHED', { agentId: currentAgentId });
      await sendCurrentState();
    } catch (error) {
      sendError('Failed to launch agent');
    }
  }

  async function handleSendInput(payload: any) {
    const { input } = payload;
    
    if (!input) {
      sendError('Missing input');
      return;
    }

    // If no agent is active, launch appropriate agent based on connection type
    if (!currentAgentId) {
      // For non-Claude terminals, launch a bash shell
      if (!autoLaunchClaude) {
        try {
          // Create session if needed
          if (!currentSessionId) {
            currentSessionId = await stateManager.createSession(process.cwd(), 'bash');
            send('SESSION_CREATED', { sessionId: currentSessionId });
          }
          
          // Launch bash agent
          currentAgentId = await agentManager.launchAgent('bash', {
            sessionId: currentSessionId,
            workspacePath: process.cwd()
          });
          
          // Set up agent event listeners
          const handleOutput = (data: { agentId: string; data: string }) => {
            if (data.agentId === currentAgentId) {
              send('OUTPUT', { data: data.data });
            }
          };

          const handleError = (data: { agentId: string; error: string }) => {
            if (data.agentId === currentAgentId) {
              send('ERROR', { message: data.error });
            }
          };

          const handleExit = (data: { agentId: string; code: number }) => {
            if (data.agentId === currentAgentId) {
              send('AGENT_EXIT', { code: data.code });
              currentAgentId = null;
              
              // Clean up listeners
              agentManager.off('agent_output', handleOutput);
              agentManager.off('agent_error', handleError);
              agentManager.off('agent_exit', handleExit);
            }
          };

          agentManager.on('agent_output', handleOutput);
          agentManager.on('agent_error', handleError);
          agentManager.on('agent_exit', handleExit);

          send('AGENT_LAUNCHED', { agentId: currentAgentId });
          
          // Now send the input
          await agentManager.sendToAgent(currentAgentId, input);
          
          // Log command
          if (currentSessionId) {
            await stateManager.logCommand(currentSessionId, input, '', null);
          }
          return;
        } catch (error) {
          console.error('Failed to launch bash agent:', error);
          sendError('Failed to launch terminal');
          return;
        }
      } else {
        send('OUTPUT', { data: '\r\nClaude is starting up...\r\n' });
        return;
      }
    }

    // Send to active agent
    try {
      await agentManager.sendToAgent(currentAgentId, input);
      
      // Log command
      if (currentSessionId) {
        await stateManager.logCommand(currentSessionId, input, '', null);
      }
    } catch (error) {
      sendError('Failed to send input to agent');
    }
  }

  async function handleStopAgent() {
    if (!currentAgentId) {
      sendError('No active agent');
      return;
    }

    try {
      await agentManager.stopAgent(currentAgentId);
      currentAgentId = null;
      send('AGENT_STOPPED');
      await sendCurrentState();
    } catch (error) {
      sendError('Failed to stop agent');
    }
  }

  async function handleCreateSnapshot(payload: any) {
    const { name, description } = payload;
    
    if (!currentSessionId) {
      sendError('No active session');
      return;
    }

    if (!name || !description) {
      sendError('Missing required fields: name, description');
      return;
    }

    try {
      const snapshotId = await stateManager.createSnapshot(currentSessionId, name, description);
      send('SNAPSHOT_CREATED', { snapshotId });
    } catch (error) {
      sendError('Failed to create snapshot');
    }
  }

  async function handleResize(payload: any) {
    const { cols, rows } = payload;
    
    if (!currentAgentId) {
      // No active agent, nothing to resize
      return;
    }

    if (!cols || !rows) {
      sendError('Missing required fields: cols, rows');
      return;
    }

    try {
      // Get the active agent and resize its PTY
      const agent = agentManager.getAgent(currentAgentId);
      if (agent && agent.resize) {
        await agent.resize(cols, rows);
      }
    } catch (error) {
      console.error('Failed to resize terminal:', error);
      // Don't send error to user as resize is a background operation
    }
  }
}