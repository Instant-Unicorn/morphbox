import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { readFile, access } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';
import type { MorphFileFormat } from '$lib/types/morph';
import { validateMorphFile, createMorphFile } from '$lib/types/morph';

const PANELS_DIR = join(homedir(), 'morphbox', 'panels');

export const GET: RequestHandler = async ({ params }) => {
  try {
    const { id } = params;
    
    if (!id) {
      return json({ error: 'Panel ID is required' }, { status: 400 });
    }
    
    // First try to read .morph file
    const morphPath = join(PANELS_DIR, `${id}.morph`);
    
    try {
      await access(morphPath);
      const morphContent = await readFile(morphPath, 'utf-8');
      const morphData = JSON.parse(morphContent) as MorphFileFormat;
      
      if (validateMorphFile(morphData)) {
        // Return the .morph file as a download
        return new Response(JSON.stringify(morphData, null, 2), {
          headers: {
            'Content-Type': 'application/json',
            'Content-Disposition': `attachment; filename="${id}.morph"`
          }
        });
      }
    } catch (morphError) {
      // .morph file doesn't exist or is invalid
    }
    
    // Try to convert legacy files to .morph format
    const jsPath = join(PANELS_DIR, `${id}.js`);
    const metadataPath = join(PANELS_DIR, `${id}.json`);
    
    try {
      const [code, metadataContent] = await Promise.all([
        readFile(jsPath, 'utf-8'),
        readFile(metadataPath, 'utf-8')
      ]);
      
      const metadata = JSON.parse(metadataContent);
      
      // Create a .morph file from legacy data
      const morphFile = createMorphFile(
        {
          id: metadata.id || id,
          name: metadata.name || id,
          description: metadata.description || '',
          version: metadata.version || '1.0.0',
          features: metadata.features || [],
          author: metadata.author,
          icon: metadata.icon,
          defaultSize: metadata.defaultSize,
          persistent: metadata.persistent,
          tags: metadata.tags
        },
        code
      );
      
      // Copy over prompt history if it exists
      if (metadata.promptHistory) {
        morphFile.promptHistory = metadata.promptHistory;
      }
      
      // Copy over timestamps if they exist
      if (metadata.createdAt) {
        morphFile.createdAt = metadata.createdAt;
      }
      if (metadata.updatedAt) {
        morphFile.updatedAt = metadata.updatedAt;
      }
      
      // Return as download
      return new Response(JSON.stringify(morphFile, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${id}.morph"`
        }
      });
    } catch (legacyError) {
      // No files found
      return json({ error: 'Panel not found' }, { status: 404 });
    }
  } catch (error) {
    console.error('Failed to export panel:', error);
    return json({ 
      error: error instanceof Error ? error.message : 'Failed to export panel' 
    }, { status: 500 });
  }
};