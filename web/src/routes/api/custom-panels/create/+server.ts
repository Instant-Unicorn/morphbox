import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { homedir, tmpdir } from 'os';
import { spawn } from 'child_process';
import { writeFileSync, unlinkSync, mkdirSync, rmSync } from 'fs';
import type { MorphFileFormat } from '$lib/types/morph';
import { createMorphFile } from '$lib/types/morph';

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
    console.log('=== Starting Claude Panel Generation ===');
    console.log('Panel Name:', name);
    console.log('Description:', description);
    
    const prompt = `Create a vanilla JavaScript panel for MorphBox with the following requirements:

Panel Name: ${name}
Description: ${description}

Generate a complete HTML/CSS/JavaScript panel that:
1. Uses vanilla JavaScript (no frameworks)
2. Has access to these variables: panelId, data, websocketUrl
3. Uses MorphBox CSS variables for theming (--bg-primary, --text-primary, --border-color, etc.)
4. Implements the functionality described above
5. Uses proper error handling and loading states where applicable

IMPORTANT: Return ONLY the HTML code starting with <!DOCTYPE html> or <div> tags. Do not include any markdown formatting, code blocks, or explanations. Just the raw HTML/CSS/JavaScript code.
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

    console.log('Prompt length:', prompt.length);
    
    // Use Claude CLI in a dedicated temporary directory
    const startTime = Date.now();
    console.log('Executing Claude CLI in dedicated temp directory...');
    
    // Create a temporary directory for this Claude session
    const tempDir = join(tmpdir(), `claude-session-${Date.now()}`);
    mkdirSync(tempDir, { recursive: true });
    console.log('Created temp directory:', tempDir);
    
    const claude = spawn('claude', ['-p', prompt], {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: tempDir, // Run Claude in the temp directory
      env: { ...process.env }
    });

    console.log('Claude process spawned, PID:', claude.pid);
    console.log('Command:', `claude -p [prompt] (in ${tempDir})`);

    let output = '';
    let error = '';
    let isResolved = false;

    // Set a timeout (2 minutes for complex panel generation)
    const timeout = setTimeout(() => {
      if (!isResolved) {
        console.error('=== Claude Process Timeout ===');
        console.error('Process took longer than 120 seconds');
        console.error('Output received so far:', output.length, 'characters');
        console.error('Error output:', error);
        claude.kill('SIGTERM');
        reject(new Error('Claude process timed out after 120 seconds'));
      }
    }, 120000);

    // Handle stdout
    claude.stdout.on('data', (data) => {
      const chunk = data.toString();
      output += chunk;
      console.log(`Received stdout chunk: ${chunk.length} characters`);
      console.log('Chunk preview:', chunk.substring(0, 200));
    });

    // Handle stderr
    claude.stderr.on('data', (data) => {
      const chunk = data.toString();
      error += chunk;
      console.error('Received stderr:', chunk);
    });

    // Handle errors
    claude.on('error', (err) => {
      clearTimeout(timeout);
      isResolved = true;
      console.error('Claude spawn error:', err);
      reject(err);
    });

    // Handle exit
    claude.on('exit', (code) => {
      clearTimeout(timeout);
      isResolved = true;
      
      // Clean up temp directory
      try {
        rmSync(tempDir, { recursive: true, force: true });
        console.log('Cleaned up temp directory');
      } catch (e) {
        console.warn('Failed to clean up temp directory:', e);
      }
      
      const duration = Date.now() - startTime;
      console.log(`=== Claude Process Completed ===`);
      console.log(`Exit code: ${code}`);
      console.log(`Duration: ${duration}ms`);
      console.log(`Total output: ${output.length} characters`);
      console.log(`Total error: ${error.length} characters`);
      
      if (code !== 0) {
        console.error('Claude process failed with code:', code);
        console.error('Error output:', error);
        console.error('Standard output preview:', output.substring(0, 500));
        reject(new Error(`Claude process exited with code ${code}: ${error}`));
      } else {
        console.log('Claude completed successfully');
        console.log('Full output preview (first 1000 chars):', output.substring(0, 1000));
        
        // Try multiple patterns to extract the component
        // 1. Look for content between code blocks (most common)
        const codeBlockPatterns = [
          /```(?:html|svelte|xml|javascript)?\s*\n([\s\S]*?)```/,
          /```\s*\n([\s\S]*?)```/
        ];
        
        for (const pattern of codeBlockPatterns) {
          const match = output.match(pattern);
          if (match && match[1]) {
            console.log('Found code block match with pattern:', pattern);
            resolve(match[1].trim());
            return;
          }
        }
        
        // 2. Look for complete HTML structure with metadata
        const fullMatch = output.match(/<!--\s*@morphbox-panel[\s\S]*?<\/script>/i);
        if (fullMatch) {
          console.log('Found full panel match');
          resolve(fullMatch[0]);
          return;
        }
        
        // 3. Look for any HTML-like structure
        const htmlMatch = output.match(/(<div[\s\S]*?<\/script>)/i);
        if (htmlMatch) {
          console.log('Found HTML structure match');
          resolve(htmlMatch[1]);
          return;
        }
        
        // 4. Look for DOCTYPE html
        const doctypeMatch = output.match(/<!DOCTYPE html>[\s\S]*/i);
        if (doctypeMatch) {
          console.log('Found DOCTYPE match');
          resolve(doctypeMatch[0]);
          return;
        }
        
        // 5. Check if entire output looks like HTML
        if (output.trim().startsWith('<') && (output.includes('</div>') || output.includes('</html>'))) {
          console.log('Output appears to be raw HTML');
          resolve(output.trim());
          return;
        }
        
        // If nothing matched, log the output for debugging
        console.error('=== Could not parse Claude response ===');
        console.error('Output length:', output.length);
        console.error('First 500 chars:', output.substring(0, 500));
        console.error('Last 500 chars:', output.substring(output.length - 500));
        
        // Try to return the raw output if it looks like HTML
        if (output.trim().length > 0) {
          console.log('Returning raw output as fallback');
          resolve(output.trim());
          return;
        }
        
        reject(new Error('Could not extract panel component from Claude response'));
      }
    });

    // Close stdin immediately since we're passing prompt as argument
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
    const filename = `${id}.morph`;
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
    
    // Create .morph file with all data
    const morphFile = createMorphFile(
      {
        id,
        name,
        description,
        version: '1.0.0',
        features: [],
        tags: []
      },
      content,
      description
    );
    
    // Write the .morph file
    await writeFile(filepath, JSON.stringify(morphFile, null, 2), 'utf-8');
    
    return json({
      id,
      filename,
      path: filepath,
      metadata: morphFile.metadata,
      format: 'morph'
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