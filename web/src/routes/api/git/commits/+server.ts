import { json } from '@sveltejs/kit';
import { exec } from 'child_process';
import { promisify } from 'util';
import type { RequestHandler } from './$types';

const execAsync = promisify(exec);

export const GET: RequestHandler = async ({ url }) => {
  try {
    const limit = parseInt(url.searchParams.get('limit') || '50');
    
    // Get commit history
    const { stdout } = await execAsync(
      `git log --pretty=format:'%H|%h|%an|%ad|%s' --date=iso -${limit}`
    );
    
    const commits = stdout
      .split('\n')
      .filter(line => line.trim())
      .map(line => {
        const [hash, shortHash, author, date, ...messageParts] = line.split('|');
        return {
          hash,
          shortHash,
          author,
          date: new Date(date),
          message: messageParts.join('|')
        };
      });
    
    return json(commits);
  } catch (error) {
    console.error('Git commits error:', error);
    return json({ error: 'Failed to get commits' }, { status: 500 });
  }
};