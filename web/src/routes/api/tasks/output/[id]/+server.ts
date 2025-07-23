import { json } from '@sveltejs/kit';
import { taskManager } from '$lib/server/task-manager';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, url }) => {
  try {
    const taskId = params.id;
    const lastLine = parseInt(url.searchParams.get('lastLine') || '0');
    
    const result = taskManager.getTaskOutput(taskId, lastLine);
    
    return json(result);
  } catch (error: any) {
    console.error('Failed to get task output:', error);
    return json({ error: error.message }, { status: 500 });
  }
};