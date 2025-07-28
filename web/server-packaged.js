#!/usr/bin/env node

import { handler } from './build/handler.js';
import { env } from './build/env.js';
import polka from 'polka';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

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

// For packaged version, WebSocket server runs inside Docker container
console.log('[INFO] WebSocket server is provided by Docker container');

// Create the main server
const server = polka();

// Add middleware to inject terminal mode flag
server.use((req, res, next) => {
  req.terminalMode = terminalMode;
  next();
});

// Add the SvelteKit handler
server.use(handler);

// Start the server
server.listen({ path, host, port }, () => {
  console.log(`[INFO] MorphBox web interface running on http://${host}:${port}`);
  
  if (terminalMode) {
    console.log('[INFO] Terminal mode enabled - UI is minimal');
  }
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