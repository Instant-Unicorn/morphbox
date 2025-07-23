import { json } from '@sveltejs/kit';
import { exec } from 'child_process';
import { promisify } from 'util';
import type { RequestHandler } from './$types';

const execAsync = promisify(exec);

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { path } = await request.json();
    
    if (!path) {
      return json({ error: 'Path is required' }, { status: 400 });
    }
    
    await execAsync(`git reset HEAD "${path}"`);
    
    return json({ success: true });
  } catch (error) {
    console.error('Git unstage error:', error);
    return json({ error: 'Failed to unstage file' }, { status: 500 });
  }
};