import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { promises as fs } from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// POST /api/codex-auth - Setup Codex CLI authentication
export const POST: RequestHandler = async ({ request }) => {
  try {
    const { authContent } = await request.json();

    if (!authContent) {
      throw error(400, 'Auth content is required');
    }

    // Validate JSON format
    let authData: any;
    try {
      authData = JSON.parse(authContent);
    } catch (err) {
      throw error(400, 'Invalid JSON format in auth.json');
    }

    // Log what we received for debugging
    console.log('[Codex Auth] Received auth data with keys:', Object.keys(authData));

    // Basic validation - Codex auth.json should be an object with token-related fields
    // Common fields: access_token, refresh_token, token_type, expires_in, expires_at
    if (typeof authData !== 'object' || authData === null || Array.isArray(authData)) {
      throw error(400, 'Invalid auth.json - must be a JSON object');
    }

    // Check if it looks like an auth file (has at least some relevant fields)
    const hasTokenFields = Object.keys(authData).some(key =>
      key.includes('token') || key.includes('access') || key.includes('refresh') || key.includes('expires')
    );

    if (!hasTokenFields) {
      const receivedKeys = Object.keys(authData).join(', ');
      throw error(400, `Invalid auth.json - doesn't appear to be an authentication file. Received keys: ${receivedKeys}`);
    }

    // Get the project root (where package.json is)
    const projectRoot = path.resolve(process.cwd());
    const scriptPath = path.join(projectRoot, 'scripts', 'codex-auth.json');
    const setupScriptPath = path.join(projectRoot, 'scripts', 'codex-setup-auth.sh');

    // Ensure scripts directory exists
    const scriptsDir = path.dirname(scriptPath);
    await fs.mkdir(scriptsDir, { recursive: true });

    // Write auth.json to scripts directory
    await fs.writeFile(scriptPath, authContent, 'utf-8');
    console.log('[Codex Auth] auth.json written to:', scriptPath);

    // Check if setup script exists
    try {
      await fs.access(setupScriptPath, fs.constants.X_OK);
    } catch (err) {
      // Make script executable if it's not
      try {
        await fs.chmod(setupScriptPath, '755');
        console.log('[Codex Auth] Made setup script executable');
      } catch (chmodErr) {
        console.error('[Codex Auth] Failed to make script executable:', chmodErr);
        throw error(500, 'Setup script is not executable');
      }
    }

    // Execute the setup script
    console.log('[Codex Auth] Running setup script:', setupScriptPath);
    try {
      const { stdout, stderr } = await execAsync(setupScriptPath, {
        cwd: projectRoot,
        timeout: 30000 // 30 second timeout
      });

      console.log('[Codex Auth] Setup script stdout:', stdout);
      if (stderr) {
        console.log('[Codex Auth] Setup script stderr:', stderr);
      }

      // Check if script succeeded
      if (stdout.includes('✓') || stdout.includes('Setup Complete') || stdout.includes('successfully')) {
        return json({
          success: true,
          message: 'Codex authentication set up successfully! You can now use Codex CLI in Terminal panels.',
          output: stdout
        });
      } else {
        // Script ran but may have warnings
        return json({
          success: true,
          message: 'Codex authentication file uploaded. Check terminal for any warnings.',
          output: stdout,
          warnings: stderr || undefined
        });
      }
    } catch (execErr: any) {
      console.error('[Codex Auth] Setup script failed:', execErr);

      // Even if script fails, the file is uploaded, so partially successful
      return json({
        success: true,
        message: 'Auth file uploaded but automated setup encountered issues. You can run the script manually: ./scripts/codex-setup-auth.sh',
        error: execErr.message,
        output: execErr.stdout,
        stderr: execErr.stderr
      }, { status: 207 }); // 207 Multi-Status (partial success)
    }
  } catch (err: any) {
    if (err instanceof Response) throw err;

    console.error('[Codex Auth] Error setting up Codex authentication:', err);
    throw error(500, err.message || 'Failed to setup Codex authentication');
  }
};
