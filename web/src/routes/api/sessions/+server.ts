import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getSessionManager } from '$lib/server/session-manager';

export const GET: RequestHandler = async () => {
  try {
    const sessionManager = getSessionManager();
    const sessions = sessionManager.listSessions();
    
    return json({
      sessions,
      count: sessions.length,
      maxSessions: 100,
      sessionTimeout: 30 * 60 * 1000 // 30 minutes
    });
  } catch (error) {
    console.error('Error listing sessions:', error);
    return json({ error: 'Failed to list sessions' }, { status: 500 });
  }
};

export const DELETE: RequestHandler = async ({ url }) => {
  try {
    const sessionId = url.searchParams.get('sessionId');
    
    if (!sessionId) {
      return json({ error: 'Session ID required' }, { status: 400 });
    }
    
    const sessionManager = getSessionManager();
    const success = sessionManager.closeSession(sessionId);
    
    if (success) {
      return json({ success: true, message: 'Session closed' });
    } else {
      return json({ error: 'Session not found' }, { status: 404 });
    }
  } catch (error) {
    console.error('Error closing session:', error);
    return json({ error: 'Failed to close session' }, { status: 500 });
  }
};