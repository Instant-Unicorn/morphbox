#!/usr/bin/env node

import { handler } from './build/handler.js';
import { env } from './build/env.js';
import { createServer } from 'http';
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

// Create the HTTP server
const server = createServer((req, res) => {
  // Inject terminal mode
  req.terminalMode = terminalMode;
  
  // Log request
  console.log(`[DEBUG] Request: ${req.method} ${req.url}`);
  
  // Test endpoint
  if (req.url === '/test') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('MorphBox server is running!');
    return;
  }
  
  // Handle with SvelteKit
  handler(req, res, (err) => {
    if (err) {
      console.error('[ERROR] Handler error:', err);
      res.statusCode = 500;
      res.end('Internal Server Error');
    }
  });
});

// Start the server
const listenPort = parseInt(port);
// Force IPv4 for localhost
const listenHost = host === 'localhost' ? '127.0.0.1' : host;
console.log(`[DEBUG] Attempting to listen on ${listenHost}:${listenPort}...`);

server.listen(listenPort, listenHost, () => {
  const addr = server.address();
  console.log('[DEBUG] Server address:', addr);
  console.log(`[INFO] MorphBox web interface running on http://${listenHost}:${listenPort}`);
  
  if (terminalMode) {
    console.log('[INFO] Terminal mode enabled - UI is minimal');
  }
});

server.on('error', (err) => {
  console.error('[ERROR] Server error:', err);
  process.exit(1);
});

// Handle process termination
process.on('SIGTERM', () => {
  console.log('[INFO] Received SIGTERM, shutting down...');
  server.close(() => {
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('[INFO] Received SIGINT, shutting down...');
  server.close(() => {
    process.exit(0);
  });
});

// Log that we're still running after 2 seconds
setTimeout(() => {
  console.log('[DEBUG] Server process still running after 2 seconds');
}, 2000);

// Catch any unhandled errors
process.on('uncaughtException', (err) => {
  console.error('[ERROR] Uncaught exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[ERROR] Unhandled rejection at:', promise, 'reason:', reason);
  process.exit(1);
});