import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { writeFile, mkdir } from 'fs/promises';
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

function generatePanelId(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') + 
    '-' + 
    Date.now().toString(36);
}

async function generatePanelWithClaude(name: string, description: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const prompt = `Create a vanilla JavaScript panel for MorphBox with the following requirements:

Panel Name: ${name}
Description: ${description}

Generate a complete HTML/CSS/JavaScript panel that:
1. Uses vanilla JavaScript (no frameworks)
2. Has access to these variables: panelId, data, websocketUrl
3. Uses MorphBox CSS variables for theming (--bg-primary, --text-primary, --border-color, etc.)
4. Implements the functionality described above
5. Uses proper error handling and loading states where applicable
6. Is responsive and works well on mobile

The panel should follow this structure:
<!--
@morphbox-panel
id: (will be generated)
name: ${name}
description: ${description}
version: 1.0.0
-->

<div class="custom-panel">
  <div class="panel-header">
    <h2>${name}</h2>
  </div>
  <div class="panel-content">
    <!-- Panel content here -->
  </div>
</div>

<style>
  /* Panel styles using CSS variables */
</style>

<script>
  // Panel logic here
  // Available: panelId, data, websocketUrl
  // Use vanilla JS, no frameworks
</script>

Make it fully functional and production-ready. Use modern JavaScript features.`;

    // Use Claude CLI to generate the panel
    const claude = spawn('claude', [], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let output = '';
    let error = '';
    let isResolved = false;

    // Set a timeout
    const timeout = setTimeout(() => {
      if (!isResolved) {
        claude.kill();
        reject(new Error('Claude process timed out after 30 seconds'));
      }
    }, 30000);

    claude.stdout.on('data', (data) => {
      output += data.toString();
    });

    claude.stderr.on('data', (data) => {
      error += data.toString();
    });

    claude.on('close', (code) => {
      clearTimeout(timeout);
      isResolved = true;
      
      if (code !== 0) {
        console.error('Claude process failed:', { code, error, output });
        reject(new Error(`Claude process exited with code ${code}: ${error}`));
      } else {
        console.log('Claude output length:', output.length);
        
        // Try multiple patterns to extract the component
        // 1. Look for complete HTML structure with metadata
        const fullMatch = output.match(/<!--\s*@morphbox-panel[\s\S]*?<\/script>/);
        if (fullMatch) {
          resolve(fullMatch[0]);
          return;
        }
        
        // 2. Look for content between code blocks
        const codeMatch = output.match(/```(?:html|svelte|xml)?\n([\s\S]*?)```/);
        if (codeMatch) {
          resolve(codeMatch[1]);
          return;
        }
        
        // 3. Look for any HTML-like structure
        const htmlMatch = output.match(/(<div[\s\S]*?<\/script>)/);
        if (htmlMatch) {
          resolve(htmlMatch[1]);
          return;
        }
        
        // If nothing matched, log the output for debugging
        console.error('Could not parse Claude response. Output preview:', output.substring(0, 500));
        reject(new Error('Could not extract panel component from Claude response'));
      }
    });

    claude.on('error', (err) => {
      reject(err);
    });

    // Send the prompt to Claude
    claude.stdin.write(prompt + '\n');
    claude.stdin.end();
  });
}

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { name, description } = await request.json();
    
    if (!name || !description) {
      return json({ error: 'Name and description are required' }, { status: 400 });
    }
    
    // Ensure the directory exists
    await mkdir(PANELS_DIR, { recursive: true });
    
    // Generate panel ID and filename
    const id = generatePanelId(name);
    const filename = `${id}.svelte`;
    const filepath = join(PANELS_DIR, filename);
    
    // Generate panel content using Claude
    let content: string;
    try {
      content = await generatePanelWithClaude(name, description);
      
      // Update the metadata in the generated content with the actual ID
      content = content.replace(
        /id:\s*\(will be generated\)/,
        `id: ${id}`
      );
    } catch (error) {
      console.error('Failed to generate panel with Claude:', error);
      
      // Return error instead of creating fallback content
      let errorMessage = 'Failed to generate panel with Claude';
      let errorDetails = '';
      
      if (error instanceof Error) {
        if (error.message.includes('Claude process timed out')) {
          errorMessage = 'Claude took too long to respond';
          errorDetails = 'Please ensure Claude CLI is running and try again.';
        } else if (error.message.includes('exited with code')) {
          errorMessage = 'Claude CLI failed to generate panel';
          errorDetails = 'Please check that Claude CLI is properly installed and configured.';
        } else {
          errorMessage = error.message;
        }
      }
      
      return json({ 
        error: errorMessage,
        details: errorDetails
      }, { status: 500 });
    }
    
    // Create metadata file
    const metadata: PanelMetadata = {
      id,
      name,
      description,
      promptHistory: [{
        prompt: description,
        timestamp: new Date().toISOString(),
        type: 'create'
      }],
      version: '1.0.0',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    const metadataPath = join(PANELS_DIR, `${id}.json`);
    
    // Write both files
    await Promise.all([
      writeFile(filepath, content, 'utf-8'),
      writeFile(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8')
    ]);
    
    return json({
      id,
      filename,
      path: filepath,
      metadata
    });
  } catch (error) {
    console.error('Failed to create custom panel:', error);
    
    let errorMessage = 'Failed to create panel';
    let errorDetails = '';
    
    if (error instanceof Error) {
      errorMessage = error.message;
      if (error.message.includes('Claude process')) {
        errorDetails = 'The Claude CLI might be unavailable or took too long to respond. The panel was created with a basic template instead.';
      }
    }
    
    return json({ 
      error: errorMessage,
      details: errorDetails
    }, { status: 500 });
  }
};