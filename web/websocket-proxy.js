#!/usr/bin/env node

// Simple WebSocket proxy for packaged MorphBox
// Forwards WebSocket connections to Docker container via SSH (sandboxed)
// Or spawns PTY directly on host (admin terminal)

import { WebSocketServer } from 'ws';
import { Client } from 'ssh2';
import { spawn } from 'child_process';
import pty from 'node-pty';

const WS_PORT = process.env.PORT || 8009;
const WEB_PORT = process.env.MORPHBOX_WEB_PORT || 8008;
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

// Handle host terminal (Admin terminal - runs directly on host, not sandboxed)
function handleHostTerminal(ws, autoLaunchClaude, sessionId) {
  console.log('⚠️ [WebSocket Proxy] Spawning PTY on HOST (Admin Terminal)');

  // Send initial connection message
  ws.send(JSON.stringify({
    type: 'CONNECTED',
    payload: { message: 'Welcome to MorphBox Admin Terminal (Host Access)' }
  }));

  if (sessionId) {
    ws.send(JSON.stringify({
      type: 'TERMINAL_SESSION_ID',
      payload: { sessionId }
    }));
  }

  // Spawn PTY directly on host
  const command = autoLaunchClaude ? 'claude' : '/bin/bash';
  const args = autoLaunchClaude ? ['--dangerously-skip-permissions'] : [];

  const ptyProcess = pty.spawn(command, args, {
    name: 'xterm-256color',
    cols: 80,
    rows: 30,
    cwd: process.env.HOME || process.cwd(),
    env: process.env
  });

  console.log(`⚠️ [WebSocket Proxy] PTY spawned on host: ${command}`, args);

  // Always send agent launched message with appropriate agentId
  const agentId = autoLaunchClaude ? 'host-claude' : 'host-bash';
  ws.send(JSON.stringify({
    type: 'AGENT_LAUNCHED',
    payload: { agentId }
  }));

  // Handle data from PTY to WebSocket
  ptyProcess.onData((data) => {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify({
        type: 'OUTPUT',
        payload: { data: data, agentId }
      }));
    }
  });

  ptyProcess.onExit((e) => {
    console.log('[WebSocket Proxy] Host PTY exited:', e);
    ws.close();
  });

  // Handle WebSocket messages
  ws.on('message', (message) => {
    try {
      const msg = JSON.parse(message.toString());

      if (msg.type === 'SEND_INPUT') {
        ptyProcess.write(msg.payload.input);
      } else if (msg.type === 'RESIZE') {
        ptyProcess.resize(msg.payload.cols, msg.payload.rows);
      }
    } catch (err) {
      console.error('[WebSocket Proxy] Host terminal message parse error:', err);
    }
  });

  ws.on('close', () => {
    console.log('[WebSocket Proxy] WebSocket closed, killing host PTY');
    ptyProcess.kill();
  });

  ws.on('error', (err) => {
    console.error('[WebSocket Proxy] WebSocket error:', err);
    ptyProcess.kill();
  });
}

wss.on('connection', (ws, req) => {
  console.log('[WebSocket Proxy] New connection from:', req.socket.remoteAddress);
  
  // SECURITY FIX: Validate origin to prevent CSRF attacks
  const origin = req.headers.origin;

  // Build allowed origins list dynamically based on actual ports
  let allowedOrigins = [
    `http://localhost:${WEB_PORT}`,
    `http://localhost:${WS_PORT}`,
    `http://127.0.0.1:${WEB_PORT}`,
    `http://127.0.0.1:${WS_PORT}`,
    `ws://localhost:${WS_PORT}`,
    `ws://127.0.0.1:${WS_PORT}`
  ];

  // Add custom allowed origins from environment
  if (process.env.MORPHBOX_ALLOWED_ORIGINS) {
    allowedOrigins = allowedOrigins.concat(process.env.MORPHBOX_ALLOWED_ORIGINS.split(','));
  }

  // Dynamically add the current bind host origins
  if (BIND_HOST && BIND_HOST !== '0.0.0.0' && BIND_HOST !== 'localhost' && BIND_HOST !== '127.0.0.1') {
    allowedOrigins.push(`http://${BIND_HOST}:${WEB_PORT}`);
    allowedOrigins.push(`http://${BIND_HOST}:${WS_PORT}`);
    allowedOrigins.push(`ws://${BIND_HOST}:${WS_PORT}`);
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
  const sandboxed = url.searchParams.get('sandboxed') !== 'false'; // Default to true (sandboxed)

  console.log('[WebSocket Proxy] Connection params:', { autoLaunchClaude, sessionId, sandboxed });

  // For admin terminal (sandboxed=false), spawn PTY directly on host
  if (!sandboxed) {
    console.log('⚠️ [WebSocket Proxy] Admin Terminal - Running on HOST (not sandboxed)');
    handleHostTerminal(ws, autoLaunchClaude, sessionId);
    return;
  }

  // For sandbox terminal (sandboxed=true), use SSH to Docker container
  console.log('[WebSocket Proxy] Sandbox Terminal - Running in Docker container');

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

      // Always send agent launched message with appropriate agentId
      const agentId = autoLaunchClaude ? 'ssh-claude' : 'ssh-bash';
      ws.send(JSON.stringify({
        type: 'AGENT_LAUNCHED',
        payload: { agentId }
      }));

      let firstData = true;

      // Handle data from SSH to WebSocket
      stream.on('data', (data) => {
        if (ws.readyState === ws.OPEN) {
          ws.send(JSON.stringify({
            type: 'OUTPUT',
            payload: { data: data.toString(), agentId }
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