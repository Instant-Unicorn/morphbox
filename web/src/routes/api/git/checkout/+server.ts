import { json } from '@sveltejs/kit';
import { exec } from 'child_process';
import { promisify } from 'util';
import type { RequestHandler } from './$types';

const execAsync = promisify(exec);

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { branch } = await request.json();
    
    if (!branch) {
      return json({ error: 'Branch name is required' }, { status: 400 });
    }
    
    await execAsync(`git checkout "${branch}"`);
    
    return json({ success: true });
  } catch (error: any) {
    console.error('Git checkout error:', error);
    return json({ 
      error: 'Failed to checkout branch', 
      message: error.message || 'Unknown error' 
    }, { status: 500 });
  }
};