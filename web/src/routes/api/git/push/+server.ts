import { json } from '@sveltejs/kit';
import { exec } from 'child_process';
import { promisify } from 'util';
import type { RequestHandler } from './$types';

const execAsync = promisify(exec);

export const POST: RequestHandler = async () => {
  try {
    await execAsync('git push');
    return json({ success: true });
  } catch (error: any) {
    console.error('Git push error:', error);
    return json({ 
      error: 'Failed to push', 
      message: error.message || 'Unknown error' 
    }, { status: 500 });
  }
};