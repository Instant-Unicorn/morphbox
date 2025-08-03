import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { writeFile, mkdir, access } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';
import type { MorphFileFormat } from '$lib/types/morph';
import { validateMorphFile } from '$lib/types/morph';

const PANELS_DIR = join(homedir(), 'morphbox', 'panels');

function sanitizePanelId(id: string): string {
  // Ensure the ID is safe for filesystem use
  return id
    .toLowerCase()
    .replace(/[^a-z0-9\-_]/g, '-')
    .replace(/--+/g, '-')
    .replace(/^-|-$/g, '');
}

export const POST: RequestHandler = async ({ request }) => {
  try {
    const contentType = request.headers.get('content-type');
    
    let morphData: MorphFileFormat;
    
    // Handle different content types
    if (contentType?.includes('application/json')) {
      // Direct JSON upload
      morphData = await request.json();
    } else if (contentType?.includes('multipart/form-data')) {
      // File upload
      const formData = await request.formData();
      const file = formData.get('file') as File;
      
      if (!file) {
        return json({ error: 'No file provided' }, { status: 400 });
      }
      
      if (!file.name.endsWith('.morph')) {
        return json({ error: 'File must have .morph extension' }, { status: 400 });
      }
      
      const text = await file.text();
      try {
        morphData = JSON.parse(text);
      } catch (e) {
        return json({ error: 'Invalid JSON in .morph file' }, { status: 400 });
      }
    } else {
      return json({ error: 'Unsupported content type' }, { status: 400 });
    }
    
    // Validate the .morph file
    if (!validateMorphFile(morphData)) {
      return json({ error: 'Invalid .morph file format' }, { status: 400 });
    }
    
    // Ensure the directory exists
    await mkdir(PANELS_DIR, { recursive: true });
    
    // Sanitize the panel ID
    const originalId = morphData.metadata.id;
    let panelId = sanitizePanelId(originalId);
    
    // Check if a panel with this ID already exists
    let counter = 1;
    let finalId = panelId;
    while (true) {
      try {
        await access(join(PANELS_DIR, `${finalId}.morph`));
        // File exists, try a different name
        finalId = `${panelId}-${counter}`;
        counter++;
      } catch {
        // File doesn't exist, we can use this ID
        break;
      }
    }
    
    // Update the ID if it changed
    if (finalId !== originalId) {
      morphData.metadata.id = finalId;
    }
    
    // Update timestamps
    const now = new Date().toISOString();
    morphData.updatedAt = now;
    
    // If this is a re-import, don't overwrite creation date
    if (!morphData.createdAt) {
      morphData.createdAt = now;
    }
    
    // Write the .morph file
    const filepath = join(PANELS_DIR, `${finalId}.morph`);
    await writeFile(filepath, JSON.stringify(morphData, null, 2), 'utf-8');
    
    return json({
      success: true,
      id: finalId,
      originalId,
      name: morphData.metadata.name,
      path: filepath,
      imported: true,
      idChanged: finalId !== originalId
    });
  } catch (error) {
    console.error('Failed to import panel:', error);
    return json({ 
      error: error instanceof Error ? error.message : 'Failed to import panel' 
    }, { status: 500 });
  }
};