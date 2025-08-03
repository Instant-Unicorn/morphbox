import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { readFile, access } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';
import type { MorphFileFormat } from '$lib/types/morph';
import { validateMorphFile } from '$lib/types/morph';

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
        // Return the code from the .morph file
        return new Response(morphData.code, {
          headers: {
            'Content-Type': 'text/html'
          }
        });
      } else {
        console.error('Invalid .morph file format');
      }
    } catch (morphError) {
      // .morph file doesn't exist or is invalid
    }
    
    // Try to read .js file (legacy support)
    const jsPath = join(PANELS_DIR, `${id}.js`);
    
    try {
      await access(jsPath);
      const jsContent = await readFile(jsPath, 'utf-8');
      return new Response(jsContent, {
        headers: {
          'Content-Type': 'text/html'
        }
      });
    } catch (jsError) {
      // .js file doesn't exist
    }
    
    // Try to read .svelte file (legacy support)
    const sveltePath = join(PANELS_DIR, `${id}.svelte`);
    
    try {
      await access(sveltePath);
      const svelteContent = await readFile(sveltePath, 'utf-8');
      
      // Extract just the content after metadata comment if present
      const contentMatch = svelteContent.match(/<!--\s*@morphbox-panel[\s\S]*?-->([\s\S]*)/);
      const content = contentMatch ? contentMatch[1].trim() : svelteContent;
      
      return new Response(content, {
        headers: {
          'Content-Type': 'text/html'
        }
      });
    } catch (svelteError) {
      // No files found
      return json({ error: 'Panel code not found' }, { status: 404 });
    }
  } catch (error) {
    console.error('Failed to get panel code:', error);
    return json({ 
      error: error instanceof Error ? error.message : 'Failed to get panel code' 
    }, { status: 500 });
  }
};