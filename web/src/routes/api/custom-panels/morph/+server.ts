import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';
import { spawn } from 'child_process';

const PANELS_DIR = join(homedir(), 'morphbox', 'panels');

interface PanelMetadata {
  id: string;
  name: string;
  description: string;
  promptHistory: Array<{
    prompt: string;
    timestamp: string;
    type: 'create' | 'morph';
  }>;
  version: string;
  createdAt: string;
  updatedAt: string;
}

async function morphPanelWithClaude(
  currentCode: string, 
  metadata: PanelMetadata,
  morphDescription: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    const promptHistory = metadata.promptHistory
      .map((p, i) => `${i + 1}. [${p.type}] ${p.prompt}`)
      .join('\n');

    const prompt = `You are modifying an existing Svelte component for a MorphBox panel.

Panel Name: ${metadata.name}
Original Description: ${metadata.description}

Previous prompts used to create/modify this panel:
${promptHistory}

Current panel code:
\`\`\`svelte
${currentCode}
\`\`\`

New modification request:
${morphDescription}

Please update the component to incorporate the requested changes while:
1. Maintaining all existing functionality unless explicitly asked to remove it
2. Keeping the same metadata structure and updating the version number
3. Following the same coding patterns and style
4. Ensuring the component remains fully functional
5. Adding any new features or modifications as requested

Return the complete updated Svelte component.`;

    // Use Claude CLI to morph the panel
    const claude = spawn('claude', [], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let output = '';
    let error = '';

    claude.stdout.on('data', (data) => {
      output += data.toString();
    });

    claude.stderr.on('data', (data) => {
      error += data.toString();
    });

    claude.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Claude process exited with code ${code}: ${error}`));
      } else {
        // Extract the Svelte component from Claude's response
        const componentMatch = output.match(/<!--[\s\S]*?<\/style>/);
        if (componentMatch) {
          resolve(componentMatch[0]);
        } else {
          // If no proper component found, try to extract any code block
          const codeMatch = output.match(/```(?:svelte|html|typescript|ts)?\n([\s\S]*?)```/);
          if (codeMatch) {
            resolve(codeMatch[1]);
          } else {
            reject(new Error('Could not extract Svelte component from Claude response'));
          }
        }
      }
    });

    claude.on('error', (err) => {
      reject(err);
    });

    // Send the prompt to Claude
    claude.stdin.write(prompt);
    claude.stdin.end();
  });
}

function incrementVersion(version: string): string {
  const parts = version.split('.');
  const patch = parseInt(parts[2] || '0') + 1;
  return `${parts[0]}.${parts[1]}.${patch}`;
}

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { panelId, morphDescription } = await request.json();
    
    if (!panelId || !morphDescription) {
      return json({ error: 'Panel ID and morph description are required' }, { status: 400 });
    }
    
    // Read existing files
    const panelPath = join(PANELS_DIR, `${panelId}.svelte`);
    const metadataPath = join(PANELS_DIR, `${panelId}.json`);
    
    let currentCode: string;
    let metadata: PanelMetadata;
    
    try {
      [currentCode, metadata] = await Promise.all([
        readFile(panelPath, 'utf-8'),
        readFile(metadataPath, 'utf-8').then(data => JSON.parse(data))
      ]);
    } catch (error) {
      return json({ error: 'Panel not found' }, { status: 404 });
    }
    
    // Morph the panel using Claude
    let newCode: string;
    try {
      newCode = await morphPanelWithClaude(currentCode, metadata, morphDescription);
      
      // Update version in the code
      const newVersion = incrementVersion(metadata.version);
      newCode = newCode.replace(
        /version:\s*[\d.]+/,
        `version: ${newVersion}`
      );
    } catch (error) {
      console.error('Failed to morph panel with Claude:', error);
      return json({ 
        error: 'Failed to morph panel. Claude may not be available.' 
      }, { status: 500 });
    }
    
    // Update metadata
    metadata.promptHistory.push({
      prompt: morphDescription,
      timestamp: new Date().toISOString(),
      type: 'morph'
    });
    metadata.version = incrementVersion(metadata.version);
    metadata.updatedAt = new Date().toISOString();
    
    // Write updated files
    await Promise.all([
      writeFile(panelPath, newCode, 'utf-8'),
      writeFile(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8')
    ]);
    
    return json({
      success: true,
      panelId,
      newVersion: metadata.version,
      metadata
    });
  } catch (error) {
    console.error('Failed to morph custom panel:', error);
    return json({ 
      error: error instanceof Error ? error.message : 'Failed to morph panel' 
    }, { status: 500 });
  }
};