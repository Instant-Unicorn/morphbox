import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import Database from 'better-sqlite3';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';

const dbPath = './data/morphbox.db';
const db = new Database(dbPath);

export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    const { id, name, config, saveToFile } = body;

    if (!id) {
      return json({ 
        success: false, 
        error: 'Panel ID is required' 
      }, { status: 400 });
    }

    // Get current panel
    const panel = db.prepare('SELECT * FROM panels WHERE id = ?').get(id) as any;
    
    if (!panel) {
      return json({ 
        success: false, 
        error: 'Panel not found' 
      }, { status: 404 });
    }

    // Update panel in database
    const update = db.prepare(`
      UPDATE panels 
      SET name = COALESCE(?, name),
          config = COALESCE(?, config),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    update.run(
      name || panel.name,
      config ? JSON.stringify(config) : panel.config,
      id
    );
    
    const updatedPanel = db.prepare('SELECT * FROM panels WHERE id = ?').get(id) as any;
    
    // Save to file if requested
    if (saveToFile) {
      const configDir = './data/panel-configs';
      mkdirSync(configDir, { recursive: true });
      
      const filename = `${updatedPanel.type}_${updatedPanel.id}_${Date.now()}.json`;
      const filepath = join(configDir, filename);
      
      const exportData = {
        panel: {
          id: updatedPanel.id,
          name: updatedPanel.name,
          type: updatedPanel.type,
          config: JSON.parse(updatedPanel.config)
        },
        exported_at: new Date().toISOString(),
        version: '1.0'
      };
      
      writeFileSync(filepath, JSON.stringify(exportData, null, 2));
      
      return json({ 
        success: true, 
        panel: {
          ...updatedPanel,
          config: JSON.parse(updatedPanel.config)
        },
        savedFile: filepath
      });
    }
    
    return json({ 
      success: true, 
      panel: {
        ...updatedPanel,
        config: JSON.parse(updatedPanel.config)
      }
    });
  } catch (error) {
    return json({ success: false, error: error.message }, { status: 500 });
  }
};