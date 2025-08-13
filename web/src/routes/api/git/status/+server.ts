import { json } from '@sveltejs/kit';
import { exec } from 'child_process';
import { promisify } from 'util';
import { WORKSPACE_DIR } from '$lib/server/workspace';
import type { RequestHandler } from './$types';

const execAsync = promisify(exec);

export const GET: RequestHandler = async () => {
  try {
    // First check if it's a git repository
    try {
      await execAsync('git rev-parse --git-dir', { cwd: WORKSPACE_DIR });
    } catch (error) {
      // Not a git repository
      return json({
        currentBranch: '',
        branches: [],
        files: [],
        error: 'Not a git repository'
      });
    }
    
    // Get current branch
    const { stdout: branch } = await execAsync('git branch --show-current', { cwd: WORKSPACE_DIR });
    const currentBranch = branch.trim() || 'main';
    
    // Get all branches
    const { stdout: branchList } = await execAsync('git branch -a', { cwd: WORKSPACE_DIR });
    const branches = branchList
      .split('\n')
      .filter(b => b.trim())
      .map(b => {
        const name = b.replace(/^\*?\s+/, '').trim();
        const current = b.startsWith('*');
        return { name, current };
      });
    
    // Get file status
    const { stdout: status } = await execAsync('git status --porcelain=v1', { cwd: WORKSPACE_DIR });
    const files = status
      .split('\n')
      .filter(line => line.trim())
      .map(line => {
        // Git porcelain format: XY filename
        // X = index status, Y = working tree status
        const indexStatus = line[0];
        const workingStatus = line[1];
        // File path starts at position 3 (after status codes and space)
        const path = line.substring(3);
        
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