import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import Database from 'better-sqlite3';
import { readFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';

const dbPath = './data/morphbox.db';
const db = new Database(dbPath);

export const GET: RequestHandler = async ({ url }) => {
  try {
    const id = url.searchParams.get('id');
    const file = url.searchParams.get('file');
    const listFiles = url.searchParams.get('listFiles') === 'true';

    // List available saved configurations
    if (listFiles) {
      const configDir = './data/panel-configs';
      
      if (!existsSync(configDir)) {
        return json({
          success: true,
          files: []
        });
      }

      const files = readdirSync(configDir)
        .filter(f => f.endsWith('.json'))
        .map(filename => {
          const filepath = join(configDir, filename);
          const stats = require('fs').statSync(filepath);
          return {
            filename,
            filepath,
            size: stats.size,
            modified: stats.mtime
          };
        })
        .sort((a, b) => b.modified.getTime() - a.modified.getTime());

      return json({
        success: true,
        files
      });
    }

    // Load from file
    if (file) {
      const filepath = file.startsWith('./data/panel-configs/') 
        ? file 
        : join('./data/panel-configs', file);

      if (!existsSync(filepath)) {
        return json({ 
          success: false, 
          error: 'Configuration file not found' 
        }, { status: 404 });
      }

      try {
        const content = readFileSync(filepath, 'utf-8');
        const data = JSON.parse(content);
        
        return json({
          success: true,
          data
        });
      } catch (error) {
        return json({ 
          success: false, 
          error: 'Invalid configuration file' 
        }, { status: 400 });
      }
    }

    // Load from database by ID
    if (id) {
      const panel = db.prepare('SELECT * FROM panels WHERE id = ?').get(id) as any;
      
      if (!panel) {
        return json({ 
          success: false, 
          error: 'Panel not found' 
        }, { status: 404 });
      }

      return json({
        success: true,
        panel: {
          ...panel,
          config: JSON.parse(panel.config)
        }
      });
    }

    // Load multiple panels with filtering
    const type = url.searchParams.get('type');
    const name = url.searchParams.get('name');
    
    let query = 'SELECT * FROM panels WHERE 1=1';
    const params: any[] = [];
    
    if (type) {
      query += ' AND type = ?';
      params.push(type);
    }
    
    if (name) {
      query += ' AND name LIKE ?';
      params.push(`%${name}%`);
    }
    
    query += ' ORDER BY updated_at DESC';
    
    const panels = db.prepare(query).all(...params).map((panel: any) => ({
      ...panel,
      config: JSON.parse(panel.config)
    }));
    
    return json({
      success: true,
      panels
    });
  } catch (error) {
    return json({ success: false, error: error.message }, { status: 500 });
  }
};

// POST handler - import panel configuration from file
export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    const { data, createNew } = body;

    if (!data || !data.panel) {
      return json({ 
        success: false, 
        error: 'Invalid panel data' 
      }, { status: 400 });
    }

    const { name, type, config } = data.panel;

    if (createNew) {
      // Create new panel from imported data
      const insert = db.prepare(`
        INSERT INTO panels (name, type, config)
        VALUES (?, ?, ?)
      `);

      const result = insert.run(
        `${name} (Imported)`,
        type,
        JSON.stringify(config)
      );
      
      const newPanel = db.prepare('SELECT * FROM panels WHERE id = ?').get(result.lastInsertRowid) as any;
      
      return json({ 
        success: true, 
        panel: {
          ...newPanel,
          config: JSON.parse(newPanel.config)
        },
        imported: true
      });
    } else {
      // Update existing panel if ID provided
      if (!data.panel.id) {
        return json({ 
          success: false, 
          error: 'Panel ID required for update' 
        }, { status: 400 });
      }

      const update = db.prepare(`
        UPDATE panels 
        SET name = ?,
            type = ?,
            config = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);

      update.run(name, type, JSON.stringify(config), data.panel.id);
      
      const updatedPanel = db.prepare('SELECT * FROM panels WHERE id = ?').get(data.panel.id) as any;
      
      return json({ 
        success: true, 
        panel: {
          ...updatedPanel,
          config: JSON.parse(updatedPanel.config)
        },
        imported: true
      });
    }
  } catch (error) {
    return json({ success: false, error: error.message }, { status: 500 });
  }
};