import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { promises as fs } from 'fs';
import path from 'path';
import { WORKSPACE_DIR } from '$lib/server/workspace';

// Helper function to validate and normalize paths
function validatePath(requestPath: string): string {
  const normalized = path.normalize(path.join(WORKSPACE_DIR, requestPath));
  
  // Ensure the path stays within workspace directory
  if (!normalized.startsWith(WORKSPACE_DIR)) {
    throw error(403, 'Access denied: Path outside workspace directory');
  }
  
  return normalized;
}

// GET /api/files/read - Read file content
export const GET: RequestHandler = async ({ url }) => {
  try {
    const filePath = url.searchParams.get('path');
    
    if (!filePath) {
      throw error(400, 'Path is required');
    }
    
    const fullPath = validatePath(filePath);
    
    // Check if file exists and is a file
    const stats = await fs.stat(fullPath);
    
    if (stats.isDirectory()) {
      throw error(400, 'Path is a directory, not a file');
    }
    
    // Read file content
    const content = await fs.readFile(fullPath, 'utf-8');
    
    return json({
      path: filePath,
      content,
      size: stats.size,
      modified: stats.mtime.toISOString()
    });
  } catch (err) {
    if (err instanceof Response) throw err;
    
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      throw error(404, 'File not found');
    }
    
    console.error('Error reading file:', err);
    throw error(500, 'Failed to read file');
  }
};