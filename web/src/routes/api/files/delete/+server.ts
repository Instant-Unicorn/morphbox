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

// DELETE /api/files/delete - Delete file or directory
export const DELETE: RequestHandler = async ({ request }) => {
  try {
    const { path: filePath } = await request.json();
    
    if (!filePath) {
      throw error(400, 'Path is required');
    }
    
    const fullPath = validatePath(filePath);
    
    // Check if file exists
    const stats = await fs.stat(fullPath);
    
    if (stats.isDirectory()) {
      // Remove directory recursively
      await fs.rmdir(fullPath, { recursive: true });
    } else {
      // Remove file
      await fs.unlink(fullPath);
    }
    
    return json({
      success: true,
      message: 'File deleted successfully',
      path: filePath
    });
  } catch (err) {
    if (err instanceof Response) throw err;
    
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      throw error(404, 'File not found');
    }
    
    console.error('Error deleting file:', err);
    throw error(500, 'Failed to delete file');
  }
};