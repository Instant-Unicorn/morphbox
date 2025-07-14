import type { RequestHandler } from './$types';
import { agentManager, stateManager } from '../../../hooks.server';

// This endpoint provides information about the WebSocket server
export const GET: RequestHandler = async () => {
  const state = await stateManager.getCurrentState();
  const activeAgents = agentManager.getActiveAgents();

  return new Response(JSON.stringify({
    wsUrl: 'ws://localhost:8009',
    state: {
      ...state,
      activeAgents
    }
  }), {
    headers: {
      'Content-Type': 'application/json'
    }
  });
};