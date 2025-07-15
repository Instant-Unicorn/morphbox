import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import Database from 'better-sqlite3';

const dbPath = './data/morphbox.db';
const db = new Database(dbPath);

export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    const { templateId, name, config } = body;

    if (!templateId && !name) {
      return json({ 
        success: false, 
        error: 'Either templateId or name is required' 
      }, { status: 400 });
    }

    let panelName = name;
    let panelType;
    let panelConfig = config || {};

    // If templateId is provided, fetch template
    if (templateId) {
      const template = db.prepare('SELECT * FROM panel_templates WHERE id = ?').get(templateId) as any;
      
      if (!template) {
        return json({ 
          success: false, 
          error: 'Template not found' 
        }, { status: 404 });
      }

      panelName = name || `${template.name} Panel`;
      panelType = template.type;
      panelConfig = { ...JSON.parse(template.config), ...(config || {}) };
    } else {
      // Manual creation requires type
      if (!body.type) {
        return json({ 
          success: false, 
          error: 'Type is required when not using a template' 
        }, { status: 400 });
      }
      panelType = body.type;
    }

    const insert = db.prepare(`
      INSERT INTO panels (name, type, config)
      VALUES (?, ?, ?)
    `);

    const result = insert.run(panelName, panelType, JSON.stringify(panelConfig));
    
    const newPanel = db.prepare('SELECT * FROM panels WHERE id = ?').get(result.lastInsertRowid);
    
    return json({ 
      success: true, 
      panel: {
        ...newPanel,
        config: JSON.parse(newPanel.config)
      }
    });
  } catch (error) {
    return json({ success: false, error: error.message }, { status: 500 });
  }
};