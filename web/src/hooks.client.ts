import type { HandleClientError } from '@sveltejs/kit';

export const handleError: HandleClientError = ({ error, event }) => {
  console.error('Client error:', error);
  
  // Log additional context
  console.error('Error details:', {
    url: event.url.pathname,
    route: event.route.id,
    params: event.params,
    error: error
  });

  // Return a user-friendly error
  return {
    message: 'An error occurred. Please check the console for details.',
    code: 'CLIENT_ERROR'
  };
};