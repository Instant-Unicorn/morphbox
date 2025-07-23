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
    
    // Discard changes to the file
    await execAsync(`git checkout -- "${path}"`);
    
    return json({ success: true });
  } catch (error: any) {
    console.error('Git discard error:', error);
    return json({ 
      error: 'Failed to discard changes', 
      message: error.message || 'Unknown error' 
    }, { status: 500 });
  }
};