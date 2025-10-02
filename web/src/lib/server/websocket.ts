import type { WebSocket } from 'ws';
import type { IncomingMessage } from 'http';
import type { AgentManager } from './agent-manager';
import type { StateManager } from './state-manager';
import type { PersistentSessionManager } from './persistent-session-manager';
import { validateWebSocketAuth, getAuthConfig } from './auth';
import { sessionStore } from './session-store';
import crypto from 'crypto';

interface WebSocketMessage {
  type: string;
  payload?: any;
}

interface WebSocketContext {
  agentManager: AgentManager;
  stateManager: StateManager;
  sessionManager?: PersistentSessionManager;
  wss?: any; // WebSocketServer instance for broadcasting
}

// Context tracking state
let lastContextData: { used: number; max: number } | null = null;

function parseContextData(text: string): { used?: number; max?: number } | null {
  const result: { used?: number; max?: number } = {};

  // Parse <budget:token_budget>200000</budget:token_budget>
  const budgetMatch = text.match(/<budget:token_budget>(\d+)<\/budget:token_budget>/);
  if (budgetMatch) {
    result.max = parseInt(budgetMatch[1], 10);
  }

  // Parse token usage like "Token usage: 56234/200000; 143766 remaining"
  const usageMatch = text.match(/Token usage:\s*(\d+)\/(\d+)/i);
  if (usageMatch) {
    result.used = parseInt(usageMatch[1], 10);
    result.max = parseInt(usageMatch[2], 10);
  }

  // Parse "X/Y remaining" format
  const remainingMatch = text.match(/(\d+)\/(\d+)[;\s]+(\d+)\s+remaining/i);
  if (remainingMatch) {
    result.used = parseInt(remainingMatch[1], 10);
    result.max = parseInt(remainingMatch[2], 10);
  }

  return Object.keys(result).length > 0 ? result : null;
}

export function handleWebSocketConnection(
  ws: WebSocket,
  request: IncomingMessage,
  context: WebSocketContext
) {
  const { agentManager, stateManager, wss } = context;
  let currentSessionId: string | null = null;
  let currentAgentId: string | null = null;
  let terminalSessionId: string | null = null;
  
  // Handle session timeouts for this connection
  const handleSessionTimeout = async (timedOutSessionId: string) => {
    const session = sessionStore.getSession(timedOutSessionId);
    if (session?.agentId) {
      console.log(`Session ${timedOutSessionId} timed out, cleaning up agent ${session.agentId}`);
      try {
        await agentManager.stopAgent(session.agentId);
      } catch (error) {
        console.error('Error cleaning up timed-out agent:', error);
      }
    }
  };
  
  sessionStore.on('session-timeout', handleSessionTimeout);
  
  // Extract terminal session ID and autoLaunchClaude from query params if provided
  const url = new URL(request.url || '', `http://${request.headers.host}`);
  const providedSessionId = url.searchParams.get('sessionId');
  const autoLaunchClaude = url.searchParams.get('autoLaunchClaude') === 'true';
  
  // Generate or use provided session ID
  const sessionId = providedSessionId || crypto.randomBytes(12).toString('hex');
  let isReconnection = false;
  
  // Check authentication
  const authConfig = getAuthConfig();
  if (authConfig.enabled) {
    const headers = Object.fromEntries(
      Object.entries(request.headers).map(([k, v]) => [k.toLowerCase(), v as string])
    );
    
    if (!validateWebSocketAuth(url, headers)) {
      console.log('WebSocket connection rejected: Authentication failed');
      ws.close(1008, 'Authentication required');
      return;
    }
  }

  console.log('New WebSocket connection established');
  console.log('WebSocket readyState:', ws.readyState);
  console.log('Session ID:', sessionId);
  console.log('Is reconnection:', isReconnection);
  
  // Check if this is a reconnection to an existing session
  const existingSession = sessionStore.getSession(sessionId);
  if (existingSession) {
    isReconnection = true;
    currentAgentId = existingSession.agentId;
    console.log('Reconnecting to existing session:', sessionId, 'with agent:', currentAgentId);
    
    // Try to reattach to the agent
    const reattached = agentManager.reattachAgent(currentAgentId);
    if (!reattached) {
      console.log('Agent no longer exists, will create new one');
      currentAgentId = null;
      isReconnection = false;
    }
  }
  
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

  // Send welcome message with session ID
  send('CONNECTED', { 
    message: 'Welcome to MorphBox Terminal',
    sessionId: sessionId,
    isReconnection: isReconnection
  });
  
  // Launch agent automatically based on type
  if (autoLaunchClaude) {
    setTimeout(async () => {
      console.log('Auto-launching Claude for WebSocket connection');
      
      try {
        // If reconnecting and agent exists, reattach and send buffered output
        if (isReconnection && currentAgentId) {
          console.log(`Reattaching to existing agent: ${currentAgentId}`);
          
          // Try to reattach to the agent
          const reattached = agentManager.reattachAgent(currentAgentId);
          
          if (!reattached) {
            console.log('Failed to reattach to agent, creating new one');
            // Agent no longer exists, create a new one
            isReconnection = false;
            currentAgentId = null;
          } else {
            send('RECONNECTED', { agentId: currentAgentId });
            // Also send AGENT_LAUNCHED to hide the loading overlay
            send('AGENT_LAUNCHED', { agentId: currentAgentId });
            
            // Send any buffered output
            const bufferedOutput = sessionStore.getAndClearBuffer(sessionId);
            if (bufferedOutput.length > 0) {
              console.log(`Sending ${bufferedOutput.length} buffered outputs`);
              for (const output of bufferedOutput) {
                send('OUTPUT', { data: output });
              }
            }
            
            // Send current state to ensure terminal is ready
            await sendCurrentState();
            
            // Send a single carriage return after a delay to wake up Claude
            // but only if we haven't received any output recently
            const agent = agentManager.getAgent(currentAgentId);
            if (agent && agent.status === 'running') {
              let hasReceivedOutput = false;
              
              // Listen for any output for a short period
              const outputHandler = (data: { agentId: string; data: string }) => {
                if (data.agentId === currentAgentId) {
                  hasReceivedOutput = true;
                }
              };
              
              agentManager.on('agent_output', outputHandler);
              
              // After a delay, send a single CR if no output was received
              setTimeout(() => {
                agentManager.off('agent_output', outputHandler);
                
                if (!hasReceivedOutput) {
                  console.log('No output received, sending single CR to wake Claude');
                  agent.sendInput('\r');
                } else {
                  console.log('Output received, skipping automatic input');
                }
              }, 2000);
            }
          }
        }
        
        if (!isReconnection || !currentAgentId) {
          // Create new session
          currentSessionId = await stateManager.createSession(process.cwd(), 'claude');
          send('SESSION_CREATED', { sessionId: currentSessionId });

          // Launch bash agent with Claude command
          console.log('Launching bash agent with Claude');
          currentAgentId = await agentManager.launchAgent('bash', {
            sessionId: currentSessionId,
            workspacePath: process.cwd()
          });

          // Store session info
          sessionStore.createSession(sessionId, currentAgentId, {
            terminalSize: { cols: 80, rows: 24 },
            workingDirectory: process.cwd()
          });

          // After the bash agent is ready, launch Claude
          setTimeout(() => {
            const agent = agentManager.getAgent(currentAgentId);
            if (agent && agent.status === 'running') {
              // Send the Claude command
              console.log('Sending Claude command to bash agent');
              agent.sendInput('claude\n');
            }
          }, 1000);
        }

        // Set up agent event listeners
        const handleOutput = (data: { agentId: string; data: string }) => {
          if (data.agentId === currentAgentId) {
            // Parse for context data (OUTPUT is broadcast globally from websocket-server.ts)
            parseAndBroadcastContextData(data.data);

            // Buffer output if disconnected
            if (ws.readyState !== 1) {
              sessionStore.addOutput(sessionId, data.data);
            }
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
          setTimeout(async () => {
            if (!currentAgentId && ws.readyState === 1) {
              console.log('Auto-restarting SSH agent after exit');
              try {
                currentAgentId = await agentManager.launchAgent('ssh', {
                  sessionId: currentSessionId || '',
                  terminalSessionId: terminalSessionId || currentSessionId || '',
                  vmHost,
                  vmPort,
                  vmUser
                });
                console.log('SSH agent restarted with ID:', currentAgentId);
                
                // Re-attach the same event listeners
                agentManager.on('agent_output', handleOutput);
                agentManager.on('agent_error', handleError);
                agentManager.on('agent_exit', handleExit);
                agentManager.on('agent_sessionId', handleSessionId);
                
                send('AGENT_LAUNCHED', { agentId: currentAgentId });
              } catch (error) {
                console.error('Failed to restart SSH agent:', error);
                sendError('Failed to restart SSH connection');
              }
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

      // Handle context usage updates
      const handleContextUsage = ({ agentId, usage }: { agentId: string; usage: any }) => {
        if (agentId === currentAgentId) {
          send('CONTEXT_USAGE', usage);
        }
      };
      agentManager.on('context_usage', handleContextUsage);

      if (!isReconnection) {
        send('AGENT_LAUNCHED', { agentId: currentAgentId });
        await sendCurrentState();
      }
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
            // Parse for context budget information from Claude Code output
            // (OUTPUT is broadcast globally from websocket-server.ts)
            parseAndBroadcastContextData(data.data);
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

        case 'GET_ALL_AGENTS':
          // Return all active agents across all sessions for monitoring panels
          const allAgents = agentManager.getAllAgents();
          const agentInfo: Record<string, any> = {};
          for (const [id, agent] of Object.entries(allAgents)) {
            agentInfo[id] = {
              type: agent.type,
              status: agent.status,
              sessionId: agent.sessionId || 'unknown'
            };
          }
          send('ALL_AGENTS_STATE', { agents: agentInfo });
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
  ws.on('close', async (code, reason) => {
    console.log('WebSocket connection closed:', {
      code,
      reason: reason?.toString(),
      currentAgentId,
      currentSessionId,
      sessionId,
      timestamp: new Date().toISOString()
    });
    
    // Clear ping interval
    clearInterval(pingInterval);
    
    // Clean up session timeout handler
    sessionStore.off('session-timeout', handleSessionTimeout);
    
    // For persistence: detach agent instead of stopping it
    if (currentAgentId && sessionId) {
      console.log(`Detaching agent ${currentAgentId} for session ${sessionId}`);
      agentManager.detachAgent(currentAgentId);
      // Session will be cleaned up after timeout if not reconnected
    } else if (currentAgentId) {
      // No session ID, stop agent normally
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
      // Log OUTPUT data length for debugging
      if (type === 'OUTPUT' && payload?.data) {
        console.log(`  OUTPUT data length: ${payload.data.length}, preview: ${JSON.stringify(payload.data.substring(0, 50))}`);
      }
      ws.send(message);
    } else {
      console.log('Cannot send message, WebSocket not open. State:', ws.readyState);
    }
  }

  function broadcast(type: string, payload?: any, includeAgentId?: string) {
    if (!wss) {
      console.log('[broadcast] wss is undefined, cannot broadcast');
      return;
    }

    const message = JSON.stringify({
      type,
      payload: {
        ...payload,
        agentId: includeAgentId // Include agent ID so panels can filter
      }
    });

    // Broadcast to all connected clients EXCEPT the current one (it gets direct messages)
    let broadcastCount = 0;
    wss.clients.forEach((client: any) => {
      if (client !== ws && client.readyState === 1) { // Skip current WebSocket, only broadcast to others
        client.send(message);
        broadcastCount++;
      }
    });

    console.log(`[broadcast] Broadcast ${type} to ${broadcastCount} other clients (excluding current), agentId: ${includeAgentId}`);
  }

  function sendError(message: string) {
    send('ERROR', { message });
  }

  function parseAndBroadcastContextData(text: string) {
    const contextData = parseContextData(text);

    if (contextData) {
      // Update last known values
      if (contextData.max !== undefined) {
        if (!lastContextData) {
          lastContextData = { used: 0, max: contextData.max };
        } else {
          lastContextData.max = contextData.max;
        }
      }

      if (contextData.used !== undefined) {
        if (!lastContextData) {
          lastContextData = { used: contextData.used, max: 200000 }; // Default max
        } else {
          lastContextData.used = contextData.used;
        }
      }

      // Broadcast context update to this connection
      if (lastContextData) {
        console.log('[Context Tracking] Broadcasting context data:', lastContextData);
        send('context_update', {
          tokens: {
            used: lastContextData.used,
            max: lastContextData.max
          }
        });
      }
    }
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
          // Parse for context data (OUTPUT is broadcast globally from websocket-server.ts)
          parseAndBroadcastContextData(data.data);

          // Buffer output if disconnected
          if (ws.readyState !== 1) {
            sessionStore.addOutput(sessionId, data.data);
          }
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
              // Parse for context data (OUTPUT is broadcast globally from websocket-server.ts)
              parseAndBroadcastContextData(data.data);
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