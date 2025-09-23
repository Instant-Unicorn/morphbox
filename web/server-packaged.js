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
const host = env('HOST', env('MORPHBOX_HOST', '127.0.0.1'));
const port = env('PORT', !path && '8008');

console.log('[INFO] Starting MorphBox packaged server...');
console.log('[DEBUG] Environment variables:');
console.log('  - SOCKET_PATH:', path);
console.log('  - HOST:', host);
console.log('  - PORT:', port);

// For packaged version, WebSocket server runs inside Docker container
console.log('[INFO] WebSocket server is provided by Docker container');

// IMPORTANT: Don't initialize agent managers here since node-pty isn't available
console.log('[INFO] Agent management is handled by the Docker container');

// Create the HTTP server
const server = createServer(async (req, res) => {
  console.log(`[DEBUG] Incoming request: ${req.method} ${req.url}`);
  
  // Inject terminal mode
  req.terminalMode = terminalMode;
  
  try {
    // Handle with SvelteKit
    await handler(req, res);
  } catch (err) {
    console.error('[ERROR] Handler error:', err);
    res.statusCode = 500;
    res.end('Internal Server Error');
  }
});

// Start the server
const listenPort = parseInt(port);
// Convert localhost to 127.0.0.1 for proper binding
let listenHost = host;
if (host === 'localhost') {
  listenHost = '127.0.0.1';
}
console.log(`[DEBUG] Binding to ${listenHost}:${listenPort}`);

server.listen(listenPort, listenHost, () => {
  const addr = server.address();
  console.log('[INFO] Server address:', addr);
  console.log(`[INFO] MorphBox web interface running on http://${listenHost}:${listenPort}`);
  
  if (terminalMode) {
    console.log('[INFO] Terminal mode enabled - UI is minimal');
  }
  
  // Log that server is ready
  console.log('[INFO] Server is ready to accept connections');
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

// Catch any unhandled errors
process.on('uncaughtException', (err) => {
  console.error('[ERROR] Uncaught exception:', err);
  console.error(err.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[ERROR] Unhandled rejection at:', promise, 'reason:', reason);
  process.exit(1);
});