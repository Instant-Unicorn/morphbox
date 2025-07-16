import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import fs from 'fs/promises';
import path from 'path';

// Store layouts in a JSON file
const LAYOUT_FILE = path.join(process.cwd(), 'data', 'panel-layouts.json');

// Ensure data directory exists
async function ensureDataDir() {
  const dataDir = path.dirname(LAYOUT_FILE);
  try {
    await fs.access(dataDir);
  } catch {
    await fs.mkdir(dataDir, { recursive: true });
  }
}

export const GET: RequestHandler = async ({ url }) => {
  try {
    await ensureDataDir();
    
    // Try to read existing layout
    try {
      const data = await fs.readFile(LAYOUT_FILE, 'utf-8');
      const layout = JSON.parse(data);
      return json(layout);
    } catch {
      // Return default layout if file doesn't exist
      return json({
        panels: [],
        gridColumns: 1,
        gridRows: 1
      });
    }
  } catch (error) {
    console.error('Failed to load layout:', error);
    return json({ error: 'Failed to load layout' }, { status: 500 });
  }
};

export const POST: RequestHandler = async ({ request }) => {
  try {
    await ensureDataDir();
    
    const layout = await request.json();
    
    // Validate layout data
    if (!layout || !Array.isArray(layout.panels)) {
      return json({ error: 'Invalid layout data' }, { status: 400 });
    }
    
    // Save layout to file
    await fs.writeFile(LAYOUT_FILE, JSON.stringify(layout, null, 2));
    
    return json({ success: true });
  } catch (error) {
    console.error('Failed to save layout:', error);
    return json({ error: 'Failed to save layout' }, { status: 500 });
  }
};

export const DELETE: RequestHandler = async () => {
  try {
    await ensureDataDir();
    
    // Delete the layout file to reset
    try {
      await fs.unlink(LAYOUT_FILE);
    } catch {
      // File might not exist, that's ok
    }
    
    return json({ success: true });
  } catch (error) {
    console.error('Failed to reset layout:', error);
    return json({ error: 'Failed to reset layout' }, { status: 500 });
  }
};