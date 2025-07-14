import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
  return json({
    status: 'ok',
    websocket: {
      url: 'ws://localhost:8009',
      protocol: 'json',
      messageTypes: ['CONNECTED', 'OUTPUT', 'ERROR', 'STATE_UPDATE', 'SEND_INPUT']
    }
  });
};