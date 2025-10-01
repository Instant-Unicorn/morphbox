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
    
    // Construct file paths - custom panels now use .morph extension
    const morphFile = join(PANELS_DIR, `${panelId}.morph`);
    const svelteFile = join(PANELS_DIR, `${panelId}.svelte`);
    const metadataFile = join(PANELS_DIR, `${panelId}.json`);

    // Ensure the files are within the panels directory (security check)
    if (!morphFile.startsWith(PANELS_DIR) || !svelteFile.startsWith(PANELS_DIR) || !metadataFile.startsWith(PANELS_DIR)) {
      return json({ error: 'Invalid file path' }, { status: 403 });
    }

    console.log(`[DELETE] Attempting to delete panel: ${panelId}`);
    console.log(`[DELETE] Morph file: ${morphFile}`);
    console.log(`[DELETE] Legacy svelte file: ${svelteFile}`);
    console.log(`[DELETE] Legacy metadata file: ${metadataFile}`);

    // Delete the files
    const errors: string[] = [];

    // Try to delete .morph file (new format)
    try {
      await unlink(morphFile);
      console.log(`[DELETE] Successfully deleted: ${morphFile}`);
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        console.error(`[DELETE] Failed to delete morph file:`, error);
        errors.push(`Failed to delete panel file: ${error.message}`);
      } else {
        console.log(`[DELETE] Morph file not found, checking legacy formats...`);
      }
    }

    // Try to delete .svelte file (legacy format)
    try {
      await unlink(svelteFile);
      console.log(`[DELETE] Successfully deleted legacy: ${svelteFile}`);
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        console.error(`[DELETE] Failed to delete svelte file:`, error);
        errors.push(`Failed to delete panel file: ${error.message}`);
      }
    }

    // Try to delete .json file (legacy format)
    try {
      await unlink(metadataFile);
      console.log(`[DELETE] Successfully deleted legacy: ${metadataFile}`);
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        console.error(`[DELETE] Failed to delete metadata file:`, error);
        errors.push(`Failed to delete metadata file: ${error.message}`);
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