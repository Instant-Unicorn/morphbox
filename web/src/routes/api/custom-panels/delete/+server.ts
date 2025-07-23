import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { unlink } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';

const PANELS_DIR = join(homedir(), 'morphbox', 'panels');

export const DELETE: RequestHandler = async ({ params, url }) => {
  try {
    // Get the panel ID from query parameter
    const panelId = url.searchParams.get('id');
    
    if (!panelId) {
      return json({ error: 'Panel ID is required' }, { status: 400 });
    }
    
    // Sanitize the panel ID to prevent directory traversal
    const sanitizedId = panelId.replace(/[^a-zA-Z0-9-]/g, '');
    if (sanitizedId !== panelId) {
      return json({ error: 'Invalid panel ID' }, { status: 400 });
    }
    
    // Construct file paths
    const svelteFile = join(PANELS_DIR, `${panelId}.svelte`);
    const metadataFile = join(PANELS_DIR, `${panelId}.json`);
    
    // Ensure the files are within the panels directory (security check)
    if (!svelteFile.startsWith(PANELS_DIR) || !metadataFile.startsWith(PANELS_DIR)) {
      return json({ error: 'Invalid file path' }, { status: 403 });
    }
    
    console.log(`[DELETE] Attempting to delete panel: ${panelId}`);
    console.log(`[DELETE] Svelte file: ${svelteFile}`);
    console.log(`[DELETE] Metadata file: ${metadataFile}`);
    
    // Delete the files
    const errors: string[] = [];
    
    try {
      await unlink(svelteFile);
      console.log(`[DELETE] Successfully deleted: ${svelteFile}`);
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        console.error(`[DELETE] Failed to delete svelte file:`, error);
        errors.push(`Failed to delete panel file: ${error.message}`);
      } else {
        console.log(`[DELETE] Svelte file not found (already deleted?): ${svelteFile}`);
      }
    }
    
    try {
      await unlink(metadataFile);
      console.log(`[DELETE] Successfully deleted: ${metadataFile}`);
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        console.error(`[DELETE] Failed to delete metadata file:`, error);
        errors.push(`Failed to delete metadata file: ${error.message}`);
      } else {
        console.log(`[DELETE] Metadata file not found (already deleted?): ${metadataFile}`);
      }
    }
    
    if (errors.length > 0) {
      return json({ 
        error: 'Partial deletion failure', 
        details: errors 
      }, { status: 500 });
    }
    
    return json({ 
      success: true, 
      message: `Panel ${panelId} deleted successfully` 
    });
    
  } catch (error) {
    console.error('Failed to delete custom panel:', error);
    
    let errorMessage = 'Failed to delete panel';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    return json({ error: errorMessage }, { status: 500 });
  }
};