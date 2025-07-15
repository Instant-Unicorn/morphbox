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

// POST /api/files - Handle file operations
export const POST: RequestHandler = async ({ request, url }) => {
  try {
    const operation = url.searchParams.get('operation');
    const body = await request.json();
    
    switch (operation) {
      case 'read':
        return await handleRead(body);
      
      case 'write':
        return await handleWrite(body);
      
      case 'create':
        return await handleCreate(body);
      
      case 'rename':
        return await handleRename(body);
      
      default:
        throw error(400, 'Invalid operation');
    }
  } catch (err) {
    if (err instanceof Response) throw err;
    
    console.error('Error in file operation:', err);
    throw error(500, 'File operation failed');
  }
};

// DELETE /api/files/delete - Delete file
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

// Handler for read operation
async function handleRead(body: any) {
  const { path: filePath } = body;
  
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
}

// Handler for write operation
async function handleWrite(body: any) {
  const { path: filePath, content } = body;
  
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
}

// Handler for create operation
async function handleCreate(body: any) {
  const { path: filePath, type = 'file', content = '' } = body;
  
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
}

// Handler for rename operation
async function handleRename(body: any) {
  const { oldPath, newPath } = body;
  
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
}