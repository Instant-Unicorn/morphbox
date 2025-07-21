import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getPersistentSessionManager } from '$lib/server/persistent-session-manager';

export const GET: RequestHandler = async () => {
  try {
    const sessionManager = getPersistentSessionManager();
    const sessions = sessionManager.listSessions();
    
    return json({
      sessions: sessions.map(session => ({
        id: session.id,
        type: session.type,
        status: session.status,
        createdAt: session.createdAt,
        lastActivity: session.lastActivity,
        metadata: session.metadata
      })),
      count: sessions.length
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
    
    const sessionManager = getPersistentSessionManager();
    await sessionManager.killSession(sessionId);
    
    return json({ success: true, message: 'Session terminated' });
  } catch (error) {
    console.error('Error terminating session:', error);
    return json({ error: 'Failed to terminate session' }, { status: 500 });
  }
};