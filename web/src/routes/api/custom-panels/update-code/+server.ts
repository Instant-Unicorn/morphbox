import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';

const PANELS_DIR = join(homedir(), 'morphbox', 'panels');

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { panelId, code } = await request.json();

    if (!panelId || !code) {
      return json({ error: 'Panel ID and code are required' }, { status: 400 });
    }

    // Read the existing .morph file
    const filepath = join(PANELS_DIR, `${panelId}.morph`);
    const fileContent = await readFile(filepath, 'utf-8');
    const morphFile = JSON.parse(fileContent);

    // Update the code content (check which field exists)
    if ('code' in morphFile) {
      morphFile.code = code;
    } else if ('content' in morphFile) {
      morphFile.content = code;
    } else {
      // Default to code field
      morphFile.code = code;
    }

    // Update the metadata
    if (morphFile.metadata) {
      morphFile.metadata.updatedAt = new Date().toISOString();

      // Add to prompt history
      if (!morphFile.metadata.promptHistory) {
        morphFile.metadata.promptHistory = [];
      }

      morphFile.metadata.promptHistory.push({
        prompt: 'Manual code edit',
        timestamp: new Date().toISOString(),
        type: 'morph'
      });
    }

    // Write the updated file
    await writeFile(filepath, JSON.stringify(morphFile, null, 2), 'utf-8');

    return json({
      success: true,
      metadata: morphFile.metadata
    });
  } catch (error) {
    console.error('Failed to update panel code:', error);

    if ((error as any).code === 'ENOENT') {
      return json({ error: 'Panel not found' }, { status: 404 });
    }

    return json({
      error: 'Failed to update panel code',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
};