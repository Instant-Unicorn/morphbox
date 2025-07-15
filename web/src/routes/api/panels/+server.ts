import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import Database from 'better-sqlite3';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

// Initialize database
const dbPath = './data/morphbox.db';
const db = new Database(dbPath);

// Create panels table if it doesn't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS panels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    config TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Create panel_templates table if it doesn't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS panel_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    description TEXT,
    config TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Initialize with default templates if empty
const templateCount = db.prepare('SELECT COUNT(*) as count FROM panel_templates').get() as { count: number };
if (templateCount.count === 0) {
  const defaultTemplates = [
    {
      name: 'Terminal',
      type: 'terminal',
      description: 'Basic terminal panel',
      config: JSON.stringify({
        shell: '/bin/bash',
        fontSize: 14,
        theme: 'dark'
      })
    },
    {
      name: 'Code Editor',
      type: 'editor',
      description: 'Code editor panel',
      config: JSON.stringify({
        language: 'javascript',
        theme: 'monokai',
        fontSize: 14
      })
    },
    {
      name: 'File Browser',
      type: 'filebrowser',
      description: 'File browser panel',
      config: JSON.stringify({
        rootPath: '/',
        showHidden: false
      })
    },
    {
      name: 'Process Monitor',
      type: 'process',
      description: 'System process monitor',
      config: JSON.stringify({
        refreshInterval: 1000,
        sortBy: 'cpu'
      })
    }
  ];

  const insertTemplate = db.prepare(`
    INSERT INTO panel_templates (name, type, description, config)
    VALUES (?, ?, ?, ?)
  `);

  for (const template of defaultTemplates) {
    insertTemplate.run(template.name, template.type, template.description, template.config);
  }
}

// GET handler - list all panels
export const GET: RequestHandler = async ({ url }) => {
  try {
    const panels = db.prepare('SELECT * FROM panels ORDER BY created_at DESC').all();
    return json({ success: true, panels });
  } catch (error) {
    return json({ success: false, error: error.message }, { status: 500 });
  }
};

// POST handler - create new panel
export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    const { name, type, config } = body;

    if (!name || !type) {
      return json({ success: false, error: 'Name and type are required' }, { status: 400 });
    }

    const insert = db.prepare(`
      INSERT INTO panels (name, type, config)
      VALUES (?, ?, ?)
    `);

    const result = insert.run(name, type, JSON.stringify(config || {}));
    
    const newPanel = db.prepare('SELECT * FROM panels WHERE id = ?').get(result.lastInsertRowid);
    
    return json({ success: true, panel: newPanel });
  } catch (error) {
    return json({ success: false, error: error.message }, { status: 500 });
  }
};

// PUT handler - update panel
export const PUT: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    const { id, name, type, config } = body;

    if (!id) {
      return json({ success: false, error: 'Panel ID is required' }, { status: 400 });
    }

    const update = db.prepare(`
      UPDATE panels 
      SET name = COALESCE(?, name),
          type = COALESCE(?, type),
          config = COALESCE(?, config),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    update.run(name, type, config ? JSON.stringify(config) : null, id);
    
    const updatedPanel = db.prepare('SELECT * FROM panels WHERE id = ?').get(id);
    
    if (!updatedPanel) {
      return json({ success: false, error: 'Panel not found' }, { status: 404 });
    }
    
    return json({ success: true, panel: updatedPanel });
  } catch (error) {
    return json({ success: false, error: error.message }, { status: 500 });
  }
};

// DELETE handler - delete panel
export const DELETE: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return json({ success: false, error: 'Panel ID is required' }, { status: 400 });
    }

    const deleteStmt = db.prepare('DELETE FROM panels WHERE id = ?');
    const result = deleteStmt.run(id);
    
    if (result.changes === 0) {
      return json({ success: false, error: 'Panel not found' }, { status: 404 });
    }
    
    return json({ success: true, message: 'Panel deleted successfully' });
  } catch (error) {
    return json({ success: false, error: error.message }, { status: 500 });
  }
};