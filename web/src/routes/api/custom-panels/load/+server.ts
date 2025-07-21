import { text } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { readFile } from 'fs/promises';
import { normalize, isAbsolute } from 'path';
import { homedir } from 'os';

const PANELS_DIR = normalize(`${homedir()}/morphbox/panels`);

export const GET: RequestHandler = async ({ url }) => {
  try {
    const path = url.searchParams.get('path');
    if (!path) {
      return text('Path parameter is required', { status: 400 });
    }
    
    // Ensure the path is within the panels directory (security check)
    const normalizedPath = normalize(path);
    if (!normalizedPath.startsWith(PANELS_DIR)) {
      return text('Invalid path', { status: 403 });
    }
    
    // Read the file
    const content = await readFile(normalizedPath, 'utf-8');
    
    return text(content);
  } catch (error) {
    console.error('Failed to load custom panel:', error);
    return text('Failed to load panel', { status: 500 });
  }
};