import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { readFile, writeFile, access } from 'fs/promises';
import { join } from 'path';
import { homedir, tmpdir } from 'os';
import { spawn } from 'child_process';
import { mkdirSync, rmSync } from 'fs';
import type { MorphFileFormat } from '$lib/types/morph';
import { validateMorphFile } from '$lib/types/morph';

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
  metadata: any,
  morphDescription: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    const promptHistory = metadata.promptHistory
      ? metadata.promptHistory
          .map((p: any, i: number) => `${i + 1}. [${p.type}] ${p.prompt}`)
          .join('\n')
      : '';

    const prompt = `You are modifying an existing MorphBox panel.

Panel Name: ${metadata.name}
Original Description: ${metadata.description}

${promptHistory ? `Previous prompts used to create/modify this panel:\n${promptHistory}\n` : ''}

Current panel code:
\`\`\`html
${currentCode}
\`\`\`

New modification request:
${morphDescription}

Please update the panel to incorporate the requested changes while:
1. Maintaining all existing functionality unless explicitly asked to remove it
2. Following the same coding patterns and style
3. Ensuring the panel remains fully functional
4. Adding any new features or modifications as requested

Return ONLY the complete updated HTML/CSS/JavaScript code, nothing else.`;

    // Create a temporary directory for this Claude session
    const tempDir = join(tmpdir(), `claude-session-${Date.now()}`);
    mkdirSync(tempDir, { recursive: true });

    // Use Claude CLI to morph the panel
    const claude = spawn('claude', ['-p', prompt], {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: tempDir,
      env: { ...process.env }
    });

    let output = '';
    let error = '';
    let isResolved = false;

    // Set a timeout
    const timeout = setTimeout(() => {
      if (!isResolved) {
        claude.kill('SIGTERM');
        reject(new Error('Claude process timed out after 120 seconds'));
      }
    }, 120000);

    claude.stdout.on('data', (data) => {
      output += data.toString();
    });

    claude.stderr.on('data', (data) => {
      error += data.toString();
    });

    claude.on('close', (code) => {
      clearTimeout(timeout);
      isResolved = true;
      
      // Clean up temp directory
      try {
        rmSync(tempDir, { recursive: true, force: true });
      } catch (e) {
        console.warn('Failed to clean up temp directory:', e);
      }

      if (code !== 0) {
        reject(new Error(`Claude process exited with code ${code}: ${error}`));
      } else {
        // Try multiple patterns to extract the component
        const codeBlockPatterns = [
          /```(?:html|javascript|js)?\s*\n([\s\S]*?)```/,
          /```\s*\n([\s\S]*?)```/
        ];
        
        for (const pattern of codeBlockPatterns) {
          const match = output.match(pattern);
          if (match && match[1]) {
            resolve(match[1].trim());
            return;
          }
        }
        
        // If no code block found, check if the entire output looks like HTML
        if (output.includes('<div') || output.includes('<script>')) {
          resolve(output.trim());
        } else {
          reject(new Error('Could not extract panel code from Claude response'));
        }
      }
    });

    claude.on('error', (err) => {
      clearTimeout(timeout);
      isResolved = true;
      reject(err);
    });

    // Write prompt to stdin
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
    
    // First try to read .morph file
    const morphPath = join(PANELS_DIR, `${panelId}.morph`);
    let morphData: MorphFileFormat | null = null;
    let currentCode: string;
    let metadata: any;
    
    try {
      await access(morphPath);
      const morphContent = await readFile(morphPath, 'utf-8');
      morphData = JSON.parse(morphContent) as MorphFileFormat;
      
      if (validateMorphFile(morphData)) {
        currentCode = morphData.code;
        metadata = morphData.metadata;
      } else {
        throw new Error('Invalid .morph file');
      }
    } catch (morphError) {
      // Try legacy files
      const sveltePath = join(PANELS_DIR, `${panelId}.svelte`);
      const jsPath = join(PANELS_DIR, `${panelId}.js`);
      const metadataPath = join(PANELS_DIR, `${panelId}.json`);
      
      try {
        // Try .js file first (most common for custom panels)
        try {
          await access(jsPath);
          currentCode = await readFile(jsPath, 'utf-8');
        } catch {
          // Fall back to .svelte file
          await access(sveltePath);
          currentCode = await readFile(sveltePath, 'utf-8');
        }
        
        // Load metadata
        metadata = await readFile(metadataPath, 'utf-8').then(data => JSON.parse(data));
      } catch (error) {
        return json({ error: 'Panel not found' }, { status: 404 });
      }
    }
    
    // Morph the panel using Claude
    let newCode: string;
    try {
      newCode = await morphPanelWithClaude(currentCode, metadata, morphDescription);
    } catch (error) {
      console.error('Failed to morph panel with Claude:', error);
      return json({ 
        error: 'Failed to morph panel. Claude may not be available.' 
      }, { status: 500 });
    }
    
    // Update version
    const newVersion = incrementVersion(metadata.version || '1.0.0');
    
    if (morphData) {
      // Update .morph file
      morphData.code = newCode;
      morphData.metadata.version = newVersion;
      morphData.promptHistory.push({
        prompt: morphDescription,
        timestamp: new Date().toISOString(),
        type: 'morph',
        resultingVersion: newVersion
      });
      morphData.updatedAt = new Date().toISOString();
      
      await writeFile(morphPath, JSON.stringify(morphData, null, 2), 'utf-8');
      
      return json({
        success: true,
        panelId,
        newVersion,
        metadata: morphData.metadata,
        format: 'morph'
      });
    } else {
      // Update legacy files
      metadata.promptHistory = metadata.promptHistory || [];
      metadata.promptHistory.push({
        prompt: morphDescription,
        timestamp: new Date().toISOString(),
        type: 'morph'
      });
      metadata.version = newVersion;
      metadata.updatedAt = new Date().toISOString();
      
      // Write updated files
      const panelPath = join(PANELS_DIR, `${panelId}.js`);
      const metadataPath = join(PANELS_DIR, `${panelId}.json`);
      
      await Promise.all([
        writeFile(panelPath, newCode, 'utf-8'),
        writeFile(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8')
      ]);
      
      return json({
        success: true,
        panelId,
        newVersion: metadata.version,
        metadata,
        format: 'legacy'
      });
    }
  } catch (error) {
    console.error('Failed to morph custom panel:', error);
    return json({ 
      error: error instanceof Error ? error.message : 'Failed to morph panel' 
    }, { status: 500 });
  }
};