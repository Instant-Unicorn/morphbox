import { json } from '@sveltejs/kit';
import { exec } from 'child_process';
import { promisify } from 'util';
import type { RequestHandler } from './$types';

const execAsync = promisify(exec);

export const GET: RequestHandler = async () => {
  try {
    // Get current branch
    const { stdout: branch } = await execAsync('git branch --show-current');
    const currentBranch = branch.trim();
    
    // Get all branches
    const { stdout: branchList } = await execAsync('git branch -a');
    const branches = branchList
      .split('\n')
      .filter(b => b.trim())
      .map(b => {
        const name = b.replace(/^\*?\s+/, '').trim();
        const current = b.startsWith('*');
        return { name, current };
      });
    
    // Get file status
    const { stdout: status } = await execAsync('git status --porcelain=v1');
    const files = status
      .split('\n')
      .filter(line => line.trim())
      .map(line => {
        const [statusCode, ...pathParts] = line.substring(3).split(' ');
        const path = pathParts.join(' ');
        const indexStatus = line[0];
        const workingStatus = line[1];
        
        let status = 'modified';
        let staged = false;
        
        // Determine file status
        if (indexStatus === 'A' || workingStatus === 'A') {
          status = 'added';
        } else if (indexStatus === 'D' || workingStatus === 'D') {
          status = 'deleted';
        } else if (indexStatus === 'R' || workingStatus === 'R') {
          status = 'renamed';
        } else if (indexStatus === '?' && workingStatus === '?') {
          status = 'untracked';
        }
        
        // Determine if staged
        if (indexStatus !== ' ' && indexStatus !== '?') {
          staged = true;
        }
        
        return { path, status, staged };
      });
    
    return json({
      currentBranch,
      branches,
      files
    });
  } catch (error) {
    console.error('Git status error:', error);
    return json({ error: 'Failed to get git status' }, { status: 500 });
  }
};