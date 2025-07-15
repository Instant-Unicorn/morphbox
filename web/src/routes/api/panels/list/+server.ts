import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import Database from 'better-sqlite3';

const dbPath = './data/morphbox.db';
const db = new Database(dbPath);

export const GET: RequestHandler = async ({ url }) => {
  try {
    const type = url.searchParams.get('type');
    const limit = parseInt(url.searchParams.get('limit') || '100');
    const offset = parseInt(url.searchParams.get('offset') || '0');
    
    let query = 'SELECT * FROM panels';
    const params: any[] = [];
    
    if (type) {
      query += ' WHERE type = ?';
      params.push(type);
    }
    
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    
    const panels = db.prepare(query).all(...params);
    const total = db.prepare(
      type ? 'SELECT COUNT(*) as count FROM panels WHERE type = ?' : 'SELECT COUNT(*) as count FROM panels'
    ).get(type ? type : undefined) as { count: number };
    
    return json({
      success: true,
      panels,
      total: total.count,
      limit,
      offset
    });
  } catch (error) {
    return json({ success: false, error: error.message }, { status: 500 });
  }
};