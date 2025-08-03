import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { readFile, access } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';
import type { MorphFileFormat } from '$lib/types/morph';
import { validateMorphFile } from '$lib/types/morph';

const PANELS_DIR = join(homedir(), 'morphbox', 'panels');

/**
 * Parse metadata from Svelte component source
 * Looks for a special comment block at the top of the file
 */
function parseEmbeddedMetadata(source: string, id: string): any | null {
  // Look for metadata in a special comment format
  const metadataRegex = /<!--\s*@morphbox-panel\s*([\s\S]*?)-->/;
  const match = source.match(metadataRegex);
  
  if (!match) return null;
  
  try {
    // Parse YAML-like format
    const metadataText = match[1];
    const metadata: any = { id };
    
    // Simple parser for YAML-like format
    const lines = metadataText.split('\n');
    for (const line of lines) {
      const colonIndex = line.indexOf(':');
      if (colonIndex === -1) continue;
      
      const key = line.substring(0, colonIndex).trim();
      const value = line.substring(colonIndex + 1).trim();
      
      if (!key) continue;
      
      // Handle arrays
      if (value.startsWith('[') && value.endsWith(']')) {
        metadata[key] = value
          .slice(1, -1)
          .split(',')
          .map(v => v.trim().replace(/['"]/g, ''));
      }
      // Handle objects
      else if (value.startsWith('{') && value.endsWith('}')) {
        try {
          metadata[key] = JSON.parse(value);
        } catch {
          metadata[key] = value;
        }
      }
      // Handle booleans
      else if (value === 'true' || value === 'false') {
        metadata[key] = value === 'true';
      }
      // Handle numbers
      else if (!isNaN(Number(value))) {
        metadata[key] = Number(value);
      }
      // Handle strings
      else {
        metadata[key] = value.replace(/['"]/g, '');
      }
    }
    
    // Set defaults
    metadata.description = metadata.description || '';
    metadata.features = metadata.features || [];
    metadata.version = metadata.version || '1.0.0';
    metadata.createdAt = new Date().toISOString();
    
    return metadata;
  } catch (error) {
    console.error('Failed to parse embedded panel metadata:', error);
    return null;
  }
}

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
        // Return just the metadata part
        return json({
          ...morphData.metadata,
          createdAt: morphData.createdAt,
          updatedAt: morphData.updatedAt,
          promptHistory: morphData.promptHistory
        });
      } else {
        console.error('Invalid .morph file format');
      }
    } catch (morphError) {
      // .morph file doesn't exist or is invalid
    }
    
    // Try to read JSON metadata file (legacy support)
    const metadataPath = join(PANELS_DIR, `${id}.json`);
    
    try {
      await access(metadataPath);
      const metadataContent = await readFile(metadataPath, 'utf-8');
      const metadata = JSON.parse(metadataContent);
      
      return json(metadata);
    } catch (jsonError) {
      // JSON file doesn't exist, try to read embedded metadata from .svelte file
      const svelteFilePath = join(PANELS_DIR, `${id}.svelte`);
      
      try {
        await access(svelteFilePath);
        const svelteContent = await readFile(svelteFilePath, 'utf-8');
        const embeddedMetadata = parseEmbeddedMetadata(svelteContent, id);
        
        if (embeddedMetadata) {
          return json(embeddedMetadata);
        } else {
          return json({ error: 'No valid metadata found in panel file' }, { status: 404 });
        }
      } catch (svelteError) {
        // No files found
        return json({ error: 'Panel metadata not found' }, { status: 404 });
      }
    }
  } catch (error) {
    console.error('Failed to get panel metadata:', error);
    return json({ 
      error: error instanceof Error ? error.message : 'Failed to get metadata' 
    }, { status: 500 });
  }
};