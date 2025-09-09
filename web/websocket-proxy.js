#!/usr/bin/env node

// Simple WebSocket proxy for packaged MorphBox
// Forwards WebSocket connections to Docker container via SSH

import { WebSocketServer } from 'ws';
import { Client } from 'ssh2';
import { spawn } from 'child_process';

const WS_PORT = process.env.PORT || 8009;
const SSH_HOST = process.env.MORPHBOX_VM_HOST || 'localhost';
const SSH_PORT = process.env.MORPHBOX_VM_PORT || 2222;
const SSH_USER = process.env.MORPHBOX_VM_USER || 'morphbox';
// No password needed - authentication disabled for localhost/VPN security model
const BIND_HOST = process.env.HOST || '0.0.0.0';

console.log(`[WebSocket Proxy] Starting on ${BIND_HOST}:${WS_PORT}`);
console.log(`[WebSocket Proxy] SSH target: ${SSH_USER}@${SSH_HOST}:${SSH_PORT}`);

const wss = new WebSocketServer({ 
  port: WS_PORT,
  host: BIND_HOST
});

wss.on('listening', () => {
  console.log(`[WebSocket Proxy] Server listening on ${BIND_HOST}:${WS_PORT}`);
});

wss.on('connection', (ws, req) => {
  console.log('[WebSocket Proxy] New connection from:', req.socket.remoteAddress);
  
  // SECURITY FIX: Validate origin to prevent CSRF attacks
  const origin = req.headers.origin;
  
  // Build allowed origins list
  let allowedOrigins = ['http://localhost:8008', 'http://localhost:8009'];
  
  // Add custom allowed origins from environment
  if (process.env.MORPHBOX_ALLOWED_ORIGINS) {
    allowedOrigins = allowedOrigins.concat(process.env.MORPHBOX_ALLOWED_ORIGINS.split(','));
  }
  
  // Dynamically add the current bind host origins
  if (BIND_HOST && BIND_HOST !== '0.0.0.0') {
    allowedOrigins.push(`http://${BIND_HOST}:8008`);
    allowedOrigins.push(`http://${BIND_HOST}:8009`);
    allowedOrigins.push(`ws://${BIND_HOST}:8009`);
  }
  
  if (origin && !allowedOrigins.includes(origin)) {
    console.error(`[WebSocket Proxy] Rejected connection from unauthorized origin: ${origin}`);
    console.error(`[WebSocket Proxy] Allowed origins: ${allowedOrigins.join(', ')}`);
    ws.close(1008, 'Unauthorized origin');
    return;
  }
  
  const url = new URL(req.url, `http://${req.headers.host}`);
  const autoLaunchClaude = url.searchParams.get('autoLaunchClaude') === 'true';
  const sessionId = url.searchParams.get('terminalSessionId');
  
  // Create SSH connection to Docker container
  const ssh = new Client();
  let shellStream = null;
  
  ssh.on('ready', () => {
    console.log('[WebSocket Proxy] SSH connection established');
    
    // Send initial connection message
    ws.send(JSON.stringify({
      type: 'CONNECTED',
      payload: { message: 'Welcome to MorphBox Terminal' }
    }));
    
    // If we have a session ID, send it
    if (sessionId) {
      ws.send(JSON.stringify({
        type: 'TERMINAL_SESSION_ID',
        payload: { sessionId }
      }));
    }
    
    // Start appropriate agent
    const command = autoLaunchClaude ? 'claude' : 'bash';
    
    ssh.shell((err, stream) => {
      if (err) {
        console.error('[WebSocket Proxy] SSH shell error:', err);
        ws.close();
        return;
      }
      
      shellStream = stream;
      
      // Send agent launched message if Claude
      if (autoLaunchClaude) {
        ws.send(JSON.stringify({
          type: 'AGENT_LAUNCHED',
          payload: { agentId: 'ssh-claude' }
        }));
      }
      
      let firstData = true;
      
      // Handle data from SSH to WebSocket
      stream.on('data', (data) => {
        if (ws.readyState === ws.OPEN) {
          ws.send(JSON.stringify({
            type: 'OUTPUT',
            payload: { data: data.toString() }
          }));
        }
        
        // Send claude command after first prompt appears
        if (firstData && autoLaunchClaude) {
          firstData = false;
          // Small delay to ensure prompt is ready
          setTimeout(() => {
            console.log('[WebSocket Proxy] Launching Claude...');
            stream.write('claude --dangerously-skip-permissions\n');
          }, 100);
        }
      });
      
      stream.on('close', () => {
        console.log('[WebSocket Proxy] SSH stream closed');
        ws.close();
      });
    });
  });
  
  ssh.on('error', (err) => {
    console.error('[WebSocket Proxy] SSH error:', err);
    ws.close();
  });
  
  // Handle WebSocket messages
  ws.on('message', (message) => {
    try {
      const msg = JSON.parse(message.toString());
      
      if (msg.type === 'SEND_INPUT' && shellStream) {
        shellStream.write(msg.payload.input);
      } else if (msg.type === 'RESIZE' && shellStream) {
        shellStream.setWindow(msg.payload.rows, msg.payload.cols);
      }
    } catch (err) {
      console.error('[WebSocket Proxy] Message parse error:', err);
    }
  });
  
  ws.on('close', () => {
    console.log('[WebSocket Proxy] WebSocket closed');
    if (ssh) {
      ssh.end();
    }
  });
  
  ws.on('error', (err) => {
    console.error('[WebSocket Proxy] WebSocket error:', err);
  });
  
  // Connect to SSH (no password - relies on localhost/VPN isolation)
  ssh.connect({
    host: SSH_HOST,
    port: SSH_PORT,
    username: SSH_USER,
    password: ''  // Empty password for passwordless auth
  });
});

wss.on('error', (err) => {
  console.error('[WebSocket Proxy] Server error:', err);
});

// Handle shutdown
process.on('SIGTERM', () => {
  console.log('[WebSocket Proxy] Received SIGTERM, shutting down...');
  wss.close(() => {
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('[WebSocket Proxy] Received SIGINT, shutting down...');
  wss.close(() => {
    process.exit(0);
  });
});

// Add error handlers to prevent crashes
process.on('uncaughtException', (err) => {
  console.error('[WebSocket Proxy] Uncaught exception:', err);
  console.error(err.stack);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[WebSocket Proxy] Unhandled rejection at:', promise, 'reason:', reason);
});