import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { promises as fs } from 'fs';
import path from 'path';

// Base directory for file operations - restrict to /workspace for security
const WORKSPACE_DIR = '/workspace';

// Helper function to validate and normalize paths
function validatePath(requestPath: string): string {
  const normalized = path.normalize(path.join(WORKSPACE_DIR, requestPath));
  
  // Ensure the path stays within workspace directory
  if (!normalized.startsWith(WORKSPACE_DIR)) {
    throw error(403, 'Access denied: Path outside workspace directory');
  }
  
  return normalized;
}

// POST /api/files/create - Create new file or directory
export const POST: RequestHandler = async ({ request }) => {
  try {
    const { path: filePath, type = 'file', content = '' } = await request.json();
    
    if (!filePath) {
      throw error(400, 'Path is required');
    }
    
    const fullPath = validatePath(filePath);
    
    // Check if already exists
    try {
      await fs.access(fullPath);
      throw error(409, `${type === 'directory' ? 'Directory' : 'File'} already exists`);
    } catch (err) {
      // File doesn't exist, which is what we want
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw err;
      }
    }
    
    if (type === 'directory') {
      // Create directory
      await fs.mkdir(fullPath, { recursive: true });
    } else {
      // Create file
      const dir = path.dirname(fullPath);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(fullPath, content, 'utf-8');
    }
    
    return json({
      success: true,
      path: filePath,
      type
    });
  } catch (err) {
    if (err instanceof Response) throw err;
    
    console.error('Error creating file/directory:', err);
    throw error(500, 'Failed to create file/directory');
  }
};