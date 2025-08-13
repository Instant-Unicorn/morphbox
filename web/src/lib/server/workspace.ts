import { existsSync } from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

/**
 * Get the workspace directory for file operations
 * In Docker: /workspace
 * Local development: Find git root or use MORPHBOX_USER_WORKSPACE env var
 */
export function getWorkspaceDir(): string {
  // Check if running in Docker (has /workspace directory)
  if (existsSync('/workspace')) {
    return '/workspace';
  }
  
  // If environment variable is set, use it
  if (process.env.MORPHBOX_USER_WORKSPACE) {
    return process.env.MORPHBOX_USER_WORKSPACE;
  }
  
  // Try to find git root directory
  try {
    const { stdout } = require('child_process').execSync('git rev-parse --show-toplevel', { 
      encoding: 'utf8',
      cwd: process.cwd()
    });
    return stdout.trim();
  } catch (error) {
    // Fallback to parent directory of current directory if we're in 'web' folder
    const currentDir = process.cwd();
    if (path.basename(currentDir) === 'web') {
      return path.dirname(currentDir);
    }
    return currentDir;
  }
}

export const WORKSPACE_DIR = getWorkspaceDir();