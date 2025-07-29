#!/usr/bin/env node

import { handler } from './build/handler.js';
import { env } from './build/env.js';
import polka from 'polka';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Parse command line arguments
const args = process.argv.slice(2);
const terminalMode = args.includes('--terminal');

// Environment variables
const path = env('SOCKET_PATH', false);
const host = env('HOST', env('MORPHBOX_HOST', '0.0.0.0'));
const port = env('PORT', !path && '8008');
const wsPort = env('WS_PORT', '8009');

// Debug output
console.log('[DEBUG] Environment variables:');
console.log('  - SOCKET_PATH:', path);
console.log('  - HOST:', host);
console.log('  - PORT:', port, 'type:', typeof port);
console.log('  - Process env PORT:', process.env.PORT);
console.log('  - Process env HOST:', process.env.HOST);

// For packaged version, WebSocket server runs inside Docker container
console.log('[INFO] WebSocket server is provided by Docker container');

// Create the main server
const server = polka();

// Add middleware to inject terminal mode flag
server.use((req, res, next) => {
  req.terminalMode = terminalMode;
  next();
});

// Add error handling middleware
server.use((req, res, next) => {
  console.log(`[DEBUG] Request: ${req.method} ${req.url}`);
  next();
});

// Add the SvelteKit handler with error handling
server.use((req, res, next) => {
  try {
    handler(req, res, (err) => {
      if (err) {
        console.error('[ERROR] Handler error:', err);
        res.statusCode = 500;
        res.end('Internal Server Error');
      } else {
        next();
      }
    });
  } catch (err) {
    console.error('[ERROR] Handler exception:', err);
    res.statusCode = 500;
    res.end('Internal Server Error');
  }
});

// Start the server
const listenOptions = path ? { path } : { host, port: parseInt(port) };
console.log('[DEBUG] Listen options:', JSON.stringify(listenOptions));

const httpServer = server.listen(listenOptions, (err) => {
  if (err) {
    console.error('[ERROR] Failed to start server:', err);
    process.exit(1);
  }
  console.log(`[INFO] MorphBox web interface running on ${path ? path : `http://${host}:${port}`}`);
  
  if (terminalMode) {
    console.log('[INFO] Terminal mode enabled - UI is minimal');
  }
  
  // Debug: Check if server is actually listening
  const address = httpServer.address();
  console.log('[DEBUG] Server address:', address);
});

// Handle process termination
process.on('SIGTERM', () => {
  console.log('[INFO] Received SIGTERM, shutting down...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('[INFO] Received SIGINT, shutting down...');
  process.exit(0);
});

// Keep the process alive
setInterval(() => {
  // Keep alive
}, 1000);

// Log that we're still running after 2 seconds
setTimeout(() => {
  console.log('[DEBUG] Server process still running after 2 seconds');
}, 2000);