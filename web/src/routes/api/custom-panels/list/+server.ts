import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { readdir } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';

const PANELS_DIR = join(homedir(), 'morphbox', 'panels');

export const GET: RequestHandler = async () => {
  try {
    // Ensure the directory exists
    try {
      await readdir(PANELS_DIR);
    } catch {
      // Directory doesn't exist, return empty array
      return json([]);
    }
    
    // Read all .svelte files in the directory
    const files = await readdir(PANELS_DIR);
    const svelteFiles = files
      .filter(file => file.endsWith('.svelte'))
      .map(file => join(PANELS_DIR, file));
    
    return json(svelteFiles);
  } catch (error) {
    console.error('Failed to list custom panels:', error);
    return json({ error: 'Failed to list custom panels' }, { status: 500 });
  }
};