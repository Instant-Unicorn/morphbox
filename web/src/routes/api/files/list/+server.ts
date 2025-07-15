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

// GET /api/files/list - List directory contents
export const GET: RequestHandler = async ({ url }) => {
  try {
    const requestPath = url.searchParams.get('path') || '/';
    const fullPath = validatePath(requestPath);
    
    // Check if path exists
    const stats = await fs.stat(fullPath);
    
    if (!stats.isDirectory()) {
      throw error(400, 'Path is not a directory');
    }
    
    // Read directory contents
    const items = await fs.readdir(fullPath, { withFileTypes: true });
    
    // Map to a more useful format
    const contents = await Promise.all(
      items.map(async (item) => {
        const itemPath = path.join(fullPath, item.name);
        const itemStats = await fs.stat(itemPath);
        
        return {
          name: item.name,
          type: item.isDirectory() ? 'directory' : 'file',
          path: path.relative(WORKSPACE_DIR, itemPath),
          size: itemStats.size,
          modified: itemStats.mtime.toISOString(),
          created: itemStats.birthtime.toISOString()
        };
      })
    );
    
    return json({
      path: path.relative(WORKSPACE_DIR, fullPath),
      contents: contents.sort((a, b) => {
        // Directories first, then alphabetical
        if (a.type !== b.type) {
          return a.type === 'directory' ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      })
    });
  } catch (err) {
    if (err instanceof Response) throw err;
    
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      throw error(404, 'Directory not found');
    }
    
    console.error('Error listing directory:', err);
    throw error(500, 'Failed to list directory');
  }
};