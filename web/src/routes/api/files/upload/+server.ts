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

export const POST: RequestHandler = async ({ request }) => {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const targetPath = formData.get('path') as string || '/';
    
    if (!file) {
      throw error(400, 'No file provided');
    }
    
    // Validate the target directory
    const targetDir = validatePath(targetPath);
    
    // Ensure target directory exists
    await fs.mkdir(targetDir, { recursive: true });
    
    // Create full file path
    const fileName = file.name;
    const filePath = path.join(targetDir, fileName);
    
    // Check if file already exists
    try {
      await fs.access(filePath);
      // File exists, you might want to handle this differently (overwrite, rename, etc.)
      // For now, we'll overwrite
    } catch {
      // File doesn't exist, which is fine
    }
    
    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Write file to disk
    await fs.writeFile(filePath, buffer);
    
    // Get file stats
    const stats = await fs.stat(filePath);
    
    return json({
      success: true,
      path: path.relative(WORKSPACE_DIR, filePath),
      size: stats.size,
      modified: stats.mtime.toISOString()
    });
  } catch (err) {
    if (err instanceof Response) throw err;
    
    console.error('Error uploading file:', err);
    throw error(500, 'Failed to upload file');
  }
};