import { text } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { readFile } from 'fs/promises';
import { normalize, isAbsolute } from 'path';
import { homedir } from 'os';

const PANELS_DIR = normalize(`${homedir()}/morphbox/panels`);

export const GET: RequestHandler = async ({ url }) => {
  let fullPath: string = '';
  
  try {
    const path = url.searchParams.get('path');
    if (!path) {
      return text('Path parameter is required', { status: 400 });
    }
    
    // If the path is just a filename, prepend the panels directory
    if (isAbsolute(path)) {
      fullPath = normalize(path);
      // Ensure the path is within the panels directory (security check)
      if (!fullPath.startsWith(PANELS_DIR)) {
        return text('Invalid path', { status: 403 });
      }
    } else {
      // Relative path - assume it's relative to the panels directory
      fullPath = normalize(`${PANELS_DIR}/${path}`);
    }
    
    // Read the file
    const content = await readFile(fullPath, 'utf-8');
    
    return text(content);
  } catch (error: any) {
    console.error('Failed to load custom panel:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // If file not found, return a more specific error
    if (error.code === 'ENOENT') {
      return text(`Panel file not found: ${fullPath}`, { status: 404 });
    }
    
    return text(`Failed to load panel: ${errorMessage}`, { status: 500 });
  }
};