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

// POST /api/files/write - Write file content
export const POST: RequestHandler = async ({ request }) => {
  try {
    const { path: filePath, content } = await request.json();
    
    if (!filePath) {
      throw error(400, 'Path is required');
    }
    
    if (content === undefined) {
      throw error(400, 'Content is required');
    }
    
    const fullPath = validatePath(filePath);
    
    // Ensure parent directory exists
    const dir = path.dirname(fullPath);
    await fs.mkdir(dir, { recursive: true });
    
    // Write file
    await fs.writeFile(fullPath, content, 'utf-8');
    
    // Get updated stats
    const stats = await fs.stat(fullPath);
    
    return json({
      success: true,
      path: filePath,
      size: stats.size,
      modified: stats.mtime.toISOString()
    });
  } catch (err) {
    if (err instanceof Response) throw err;
    
    console.error('Error writing file:', err);
    throw error(500, 'Failed to write file');
  }
};