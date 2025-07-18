#!/usr/bin/env node

import { handler } from './build/handler.js';
import { env } from './build/env.js';
import polka from 'polka';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Parse command line arguments
const args = process.argv.slice(2);
const terminalMode = args.includes('--terminal');

// Environment variables
const path = env('SOCKET_PATH', false);
const host = env('HOST', '0.0.0.0');
const port = env('PORT', !path && '3000');
const wsPort = env('WS_PORT', '8009');

// Start the websocket server in a separate process
const wsServerPath = join(__dirname, 'src/lib/server/websocket-server.ts');
const wsProcess = spawn('tsx', [wsServerPath], {
  stdio: 'inherit',
  env: { ...process.env, WS_PORT: wsPort }
});

wsProcess.on('error', (err) => {
  console.error('Failed to start WebSocket server:', err);
  process.exit(1);
});

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
  if (terminalMode) {
    console.log(`\n🖥️  Morphbox Terminal Mode (Claude Code only)`);
    console.log(`📍 Running on ${path ? path : `http://${host}:${port}`}`);
    console.log(`🔌 WebSocket server on ws://${host}:${wsPort}`);
    console.log('\nPress Ctrl+C to exit\n');
  } else {
    console.log(`\n🚀 Morphbox running on ${path ? path : `http://${host}:${port}`}`);
    console.log(`🔌 WebSocket server on ws://${host}:${wsPort}`);
  }
});

// Handle cleanup
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down...');
  wsProcess.kill('SIGTERM');
  process.exit(0);
});

process.on('SIGTERM', () => {
  wsProcess.kill('SIGTERM');
  process.exit(0);
});

// Export for programmatic usage
export { server, terminalMode };