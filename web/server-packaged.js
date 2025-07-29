#!/usr/bin/env node

import { handler } from './build/handler.js';
import { env } from './build/env.js';
import polka from 'polka';

// Parse command line arguments
const args = process.argv.slice(2);
const terminalMode = args.includes('--terminal');

// Environment variables
const path = env('SOCKET_PATH', false);
const host = env('HOST', env('MORPHBOX_HOST', '0.0.0.0'));
const port = env('PORT', !path && '8008');
const wsPort = env('WS_PORT', '8009');

// In packaged mode, websocket server is handled separately by websocket-proxy.js
console.log('🚀 Server running in packaged mode - managers handled by Docker');

// Log configuration for debugging
console.log('[INFO] Starting MorphBox packaged server...');
console.log('[DEBUG] Environment variables:');
console.log(`  - SOCKET_PATH: ${path}`);
console.log(`  - HOST: ${host}`);
console.log(`  - PORT: ${port}`);
console.log('[INFO] WebSocket server is provided by Docker container');
console.log('[INFO] Agent management is handled by the Docker container');

// Create the main server
const server = polka();

// Add middleware to inject terminal mode flag
server.use((req, res, next) => {
  // Inject terminal mode into the request so the app can access it
  req.terminalMode = terminalMode;
  
  // Also set it as a header that the client can read
  if (terminalMode) {
    res.setHeader('X-Terminal-Mode', 'true');
  }
  
  next();
});

// Use the SvelteKit handler
server.use(handler);

// Start the server
server.listen({ path, host, port }, () => {
  const address = server.server.address();
  const actualHost = address.address === '::' ? '0.0.0.0' : address.address;
  
  console.log(`[DEBUG] Binding to ${actualHost}:${port}`);
  console.log('[INFO] Server address:', address);
  console.log(`[INFO] MorphBox web interface running on http://${actualHost}:${port}`);
  console.log('[INFO] Server is ready to accept connections');
  
  if (terminalMode) {
    console.log(`\n🖥️  Morphbox Terminal Mode (Claude Code only)`);
    console.log(`📍 Running on ${path ? path : `http://${host}:${port}`}`);
    console.log(`🔌 WebSocket server on ws://${host}:${wsPort}`);
    console.log('\nPress Ctrl+C to exit\n');
  }
});

// Handle cleanup
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  process.exit(0);
});

// Export for programmatic usage
export { server, terminalMode };