import { json } from '@sveltejs/kit';
import { taskManager } from '$lib/server/task-manager';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { pid } = await request.json();
    
    if (!pid) {
      return json({ error: 'Process ID is required' }, { status: 400 });
    }
    
    taskManager.stopTask(pid);
    
    return json({ success: true });
  } catch (error: any) {
    console.error('Failed to stop task:', error);
    return json({ error: error.message }, { status: 500 });
  }
};