import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { mkdir } from 'fs/promises';
import { homedir } from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class StateManager {
  private db: Database.Database | null = null;
  private dbPath: string;

  constructor() {
    // Use morphbox home directory for packaged version
    const morphboxHome = process.env.MORPHBOX_HOME || join(homedir(), '.morphbox');
    this.dbPath = join(morphboxHome, 'data', 'morphbox.db');
  }

  async initialize(): Promise<void> {
    // Ensure data directory exists
    const dataDir = dirname(this.dbPath);
    await mkdir(dataDir, { recursive: true });

    // Open database connection with explicit read-write mode
    this.db = new Database(this.dbPath, { 
      readonly: false,
      fileMustExist: false 
    });

    // Create tables if they don't exist
    await this.createTables();
  }

  private async createTables(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    // Sessions table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        workspace_path TEXT,
        agent_type TEXT,
        status TEXT DEFAULT 'active'
      )
    `);

    // Commands history
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS command_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT,
        command TEXT,
        output TEXT,
        error TEXT,
        executed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES sessions(id)
      )
    `);

    // File changes tracking
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS file_changes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT,
        file_path TEXT,
        action TEXT,
        content TEXT,
        changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES sessions(id)
      )
    `);

    // Workspace snapshots
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS snapshots (
        id TEXT PRIMARY KEY,
        session_id TEXT,
        name TEXT,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES sessions(id)
      )
    `);
  }

  async createSession(workspacePath: string, agentType: string): Promise<string> {
    if (!this.db) throw new Error('Database not initialized');
    
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    try {
      const stmt = this.db.prepare(
        `INSERT INTO sessions (id, workspace_path, agent_type) VALUES (?, ?, ?)`
      );
      stmt.run(sessionId, workspacePath, agentType);
    } catch (error) {
      console.error('Database write error:', error);
      if (error instanceof Error && error.message.includes('readonly')) {
        throw new Error(`Database is read-only. Check file permissions for: ${this.dbPath}`);
      }
      throw error;
    }

    return sessionId;
  }

  async getCurrentState(): Promise<{
    activeSessions: any[];
    recentCommands: any[];
    totalSessions: number;
  }> {
    if (!this.db) throw new Error('Database not initialized');

    const activeSessions = this.db.prepare(
      `SELECT * FROM sessions WHERE status = 'active' ORDER BY updated_at DESC`
    ).all();

    const recentCommands = this.db.prepare(
      `SELECT * FROM command_history ORDER BY executed_at DESC LIMIT 50`
    ).all();

    return {
      activeSessions,
      recentCommands,
      totalSessions: activeSessions.length
    };
  }

  async logCommand(sessionId: string, command: string, output: string, error: string | null = null): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare(
      `INSERT INTO command_history (session_id, command, output, error) VALUES (?, ?, ?, ?)`
    );
    stmt.run(sessionId, command, output, error);
  }

  async trackFileChange(sessionId: string, filePath: string, action: string, content: string | null = null): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare(
      `INSERT INTO file_changes (session_id, file_path, action, content) VALUES (?, ?, ?, ?)`
    );
    stmt.run(sessionId, filePath, action, content);
  }

  async createSnapshot(sessionId: string, name: string, description: string): Promise<string> {
    if (!this.db) throw new Error('Database not initialized');

    const snapshotId = `snapshot_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    const stmt = this.db.prepare(
      `INSERT INTO snapshots (id, session_id, name, description) VALUES (?, ?, ?, ?)`
    );
    stmt.run(snapshotId, sessionId, name, description);

    return snapshotId;
  }

  async getSessionHistory(sessionId: string): Promise<{
    commands: any[];
    fileChanges: any[];
  }> {
    if (!this.db) throw new Error('Database not initialized');

    const commands = this.db.prepare(
      `SELECT * FROM command_history WHERE session_id = ? ORDER BY executed_at`
    ).all(sessionId);

    const fileChanges = this.db.prepare(
      `SELECT * FROM file_changes WHERE session_id = ? ORDER BY changed_at`
    ).all(sessionId);

    return { commands, fileChanges };
  }

  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}