import { json } from '@sveltejs/kit';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { WORKSPACE_DIR } from '$lib/server/workspace';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
  try {
    // Read package.json from workspace
    const packageJsonPath = join(WORKSPACE_DIR, 'package.json');
    const packageJson = await readFile(packageJsonPath, 'utf-8');
    const pkg = JSON.parse(packageJson);
    
    // Return scripts object
    return json(pkg.scripts || {});
  } catch (error) {
    console.error('Failed to read npm scripts:', error);
    return json({});
  }
};