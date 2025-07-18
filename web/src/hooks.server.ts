import type { Handle, HandleServerError } from '@sveltejs/kit';
import { building } from '$app/environment';
import { WebSocketServer } from 'ws';
import { handleWebSocketConnection } from '$lib/server/websocket';
import { AgentManager } from '$lib/server/agent-manager';
import { StateManager } from '$lib/server/state-manager';
import { isAuthenticated, getAuthConfig, getLoginPageHTML } from '$lib/server/auth';
// import { tmuxContainerManager } from '$lib/server/tmux-container-manager';

// Initialize managers
export const agentManager = new AgentManager();
export const stateManager = new StateManager();

// Initialize on server start (only when not building)
if (!building) {
  async function initializeServer() {
    try {
      await agentManager.initialize();
      await stateManager.initialize();
      
      // Start tmux cleanup timer (clean up sessions older than 24 hours)
      // tmuxContainerManager.startCleanupTimer();
      
      console.log('🚀 Server managers initialized');
    } catch (error) {
      console.error('Failed to initialize server:', error);
      process.exit(1);
    }
  }

  // Initialize immediately
  initializeServer();
}

// For production WebSocket handling
export const handle: Handle = async ({ event, resolve }) => {
  const config = getAuthConfig();
  
  // Skip auth for certain paths
  const publicPaths = ['/api/auth/login', '/favicon.png', '/_app'];
  const isPublicPath = publicPaths.some(path => event.url.pathname.startsWith(path));
  
  // Check authentication if enabled
  if (config.enabled && !isPublicPath) {
    if (!isAuthenticated(event)) {
      // For API routes, return 401
      if (event.url.pathname.startsWith('/api/')) {
        return new Response(JSON.stringify({ error: 'Authentication required' }), {
          status: 401,
          headers: {
            'Content-Type': 'application/json'
          }
        });
      }
      
      // For page routes, show login page
      return new Response(getLoginPageHTML(), {
        status: 401,
        headers: {
          'Content-Type': 'text/html'
        }
      });
    }
  }
  
  return resolve(event);
};

// Handle server errors
export const handleError: HandleServerError = ({ error, event }) => {
  console.error('Server error:', error);
  console.error('Error context:', {
    url: event.url.pathname,
    method: event.request.method,
    headers: Object.fromEntries(event.request.headers.entries()),
    stack: error instanceof Error ? error.stack : undefined
  });

  // Return a safe error message
  return {
    message: 'Internal server error',
    code: 'SERVER_ERROR'
  };
};

// Cleanup on server shutdown
if (!building) {
  process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down server...');
    await agentManager.stopAllAgents();
    await stateManager.close();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('\n🛑 Shutting down server...');
    await agentManager.stopAllAgents();
    await stateManager.close();
    process.exit(0);
  });
}