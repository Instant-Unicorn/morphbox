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
const SSH_PASS = 'morphbox';
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
  
  const url = new URL(req.url, `http://${req.headers.host}`);
  const autoLaunchClaude = url.searchParams.get('autoLaunchClaude') === 'true';
  const sessionId = url.searchParams.get('terminalSessionId');
  
  // Create SSH connection to Docker container
  const ssh = new Client();
  let shellStream = null;
  
  ssh.on('ready', () => {
    console.log('[WebSocket Proxy] SSH connection established');
    
    // Start appropriate agent
    const command = autoLaunchClaude ? 'claude' : 'bash';
    
    ssh.shell((err, stream) => {
      if (err) {
        console.error('[WebSocket Proxy] SSH shell error:', err);
        ws.close();
        return;
      }
      
      shellStream = stream;
      
      // Handle data from SSH to WebSocket
      stream.on('data', (data) => {
        if (ws.readyState === ws.OPEN) {
          ws.send(JSON.stringify({
            type: 'output',
            data: data.toString()
          }));
        }
      });
      
      stream.on('close', () => {
        console.log('[WebSocket Proxy] SSH stream closed');
        ws.close();
      });
      
      // Send initial command if launching Claude
      if (autoLaunchClaude) {
        stream.write('claude\n');
      }
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
      
      if (msg.type === 'input' && shellStream) {
        shellStream.write(msg.data);
      } else if (msg.type === 'resize' && shellStream) {
        shellStream.setWindow(msg.rows, msg.cols);
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
  
  // Connect to SSH
  ssh.connect({
    host: SSH_HOST,
    port: SSH_PORT,
    username: SSH_USER,
    password: SSH_PASS
  });
});

wss.on('error', (err) => {
  console.error('[WebSocket Proxy] Server error:', err);
});

// Handle shutdown
process.on('SIGTERM', () => {
  console.log('[WebSocket Proxy] Shutting down...');
  wss.close(() => {
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('[WebSocket Proxy] Shutting down...');
  wss.close(() => {
    process.exit(0);
  });
});