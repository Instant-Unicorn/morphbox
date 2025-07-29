import type { Handle, HandleServerError } from '@sveltejs/kit';
import { building } from '$app/environment';
import { isAuthenticated, getAuthConfig, getLoginPageHTML } from '$lib/server/auth';

// For production/packaged version, we don't initialize managers here
// They are handled by the Docker container
console.log('🚀 Server running in packaged mode - managers handled by Docker');

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