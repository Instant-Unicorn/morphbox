import { json } from '@sveltejs/kit';
import { exec } from 'child_process';
import { promisify } from 'util';
import type { RequestHandler } from './$types';

const execAsync = promisify(exec);

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { message } = await request.json();
    
    if (!message) {
      return json({ error: 'Commit message is required' }, { status: 400 });
    }
    
    // Escape the message for shell
    const escapedMessage = message.replace(/"/g, '\\"');
    
    await execAsync(`git commit -m "${escapedMessage}"`);
    
    return json({ success: true });
  } catch (error) {
    console.error('Git commit error:', error);
    return json({ error: 'Failed to commit' }, { status: 500 });
  }
};