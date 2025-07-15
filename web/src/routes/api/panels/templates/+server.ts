import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import Database from 'better-sqlite3';

const dbPath = './data/morphbox.db';
const db = new Database(dbPath);

export const GET: RequestHandler = async ({ url }) => {
  try {
    const type = url.searchParams.get('type');
    
    let query = 'SELECT * FROM panel_templates';
    const params: any[] = [];
    
    if (type) {
      query += ' WHERE type = ?';
      params.push(type);
    }
    
    query += ' ORDER BY name ASC';
    
    const templates = db.prepare(query).all(...params).map((template: any) => ({
      ...template,
      config: JSON.parse(template.config)
    }));
    
    return json({
      success: true,
      templates
    });
  } catch (error) {
    return json({ success: false, error: error.message }, { status: 500 });
  }
};

// POST handler - add new template
export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    const { name, type, description, config } = body;

    if (!name || !type) {
      return json({ 
        success: false, 
        error: 'Name and type are required' 
      }, { status: 400 });
    }

    const insert = db.prepare(`
      INSERT INTO panel_templates (name, type, description, config)
      VALUES (?, ?, ?, ?)
    `);

    const result = insert.run(
      name, 
      type, 
      description || '', 
      JSON.stringify(config || {})
    );
    
    const newTemplate = db.prepare('SELECT * FROM panel_templates WHERE id = ?').get(result.lastInsertRowid);
    
    return json({ 
      success: true, 
      template: {
        ...newTemplate,
        config: JSON.parse(newTemplate.config)
      }
    });
  } catch (error) {
    return json({ success: false, error: error.message }, { status: 500 });
  }
};