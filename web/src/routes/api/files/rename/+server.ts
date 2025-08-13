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

// POST /api/files/rename - Rename/move file or directory
export const POST: RequestHandler = async ({ request }) => {
  try {
    const { oldPath, newPath } = await request.json();
    
    if (!oldPath || !newPath) {
      throw error(400, 'Both oldPath and newPath are required');
    }
    
    const fullOldPath = validatePath(oldPath);
    const fullNewPath = validatePath(newPath);
    
    // Check if source exists
    await fs.access(fullOldPath);
    
    // Check if destination already exists
    try {
      await fs.access(fullNewPath);
      throw error(409, 'Destination already exists');
    } catch (err) {
      // Destination doesn't exist, which is what we want
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw err;
      }
    }
    
    // Ensure destination directory exists
    const destDir = path.dirname(fullNewPath);
    await fs.mkdir(destDir, { recursive: true });
    
    // Rename/move the file
    await fs.rename(fullOldPath, fullNewPath);
    
    return json({
      success: true,
      oldPath,
      newPath
    });
  } catch (err) {
    if (err instanceof Response) throw err;
    
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      throw error(404, 'Source file not found');
    }
    
    console.error('Error renaming file:', err);
    throw error(500, 'Failed to rename file');
  }
};