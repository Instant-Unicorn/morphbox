import { json } from '@sveltejs/kit';
import { taskManager } from '$lib/server/task-manager';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { taskId, command } = await request.json();
    
    if (!taskId || !command) {
      return json({ error: 'Task ID and command are required' }, { status: 400 });
    }
    
    const pid = taskManager.runTask(taskId, command);
    
    return json({ success: true, pid });
  } catch (error: any) {
    console.error('Failed to run task:', error);
    return json({ error: error.message }, { status: 500 });
  }
};