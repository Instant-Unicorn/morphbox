import { json } from '@sveltejs/kit';
import { exec } from 'child_process';
import { promisify } from 'util';
import { WORKSPACE_DIR } from '$lib/server/workspace';
import type { RequestHandler } from './$types';

const execAsync = promisify(exec);

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { message } = await request.json();
    
    if (!message) {
      return json({ error: 'Commit message is required' }, { status: 400 });
    }
    
    // First check if there are staged changes
    const { stdout: status } = await execAsync('git status --porcelain', { cwd: WORKSPACE_DIR });
    const stagedFiles = status.split('\n').filter(line => 
      line.length > 0 && (line[0] !== ' ' && line[0] !== '?')
    );
    
    if (stagedFiles.length === 0) {
      return json({ error: 'No staged changes to commit' }, { status: 400 });
    }
    
    // Escape the message for shell
    const escapedMessage = message.replace(/"/g, '\\"');
    
    const { stdout, stderr } = await execAsync(`git commit -m "${escapedMessage}"`, { cwd: WORKSPACE_DIR });
    
    return json({ success: true, output: stdout });
  } catch (error: any) {
    console.error('Git commit error:', error);
    // Return the actual git error message
    const errorMessage = error.stderr || error.message || 'Failed to commit';
    return json({ error: errorMessage }, { status: 500 });
  }
};