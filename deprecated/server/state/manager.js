import { open } from 'sqlite';
import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class StateManager {
  constructor() {
    this.db = null;
    this.dbPath = path.join(__dirname, '../../data/morphbox.db');
  }

  async initialize() {
    // Ensure data directory exists
    const dataDir = path.dirname(this.dbPath);
    await fs.mkdir(dataDir, { recursive: true });

    // Open database connection
    this.db = await open({
      filename: this.dbPath,
      driver: sqlite3.Database
    });

    // Create tables if they don't exist
    await this.createTables();
  }

  async createTables() {
    // Sessions table
    await this.db.exec(`
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
    await this.db.exec(`
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
    await this.db.exec(`
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
    await this.db.exec(`
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

  async createSession(workspacePath, agentType) {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    await this.db.run(
      `INSERT INTO sessions (id, workspace_path, agent_type) VALUES (?, ?, ?)`,
      [sessionId, workspacePath, agentType]
    );

    return sessionId;
  }

  async getCurrentState() {
    const activeSessions = await this.db.all(
      `SELECT * FROM sessions WHERE status = 'active' ORDER BY updated_at DESC`
    );

    const recentCommands = await this.db.all(
      `SELECT * FROM command_history ORDER BY executed_at DESC LIMIT 50`
    );

    return {
      activeSessions,
      recentCommands,
      totalSessions: activeSessions.length
    };
  }

  async logCommand(sessionId, command, output, error = null) {
    await this.db.run(
      `INSERT INTO command_history (session_id, command, output, error) VALUES (?, ?, ?, ?)`,
      [sessionId, command, output, error]
    );
  }

  async trackFileChange(sessionId, filePath, action, content = null) {
    await this.db.run(
      `INSERT INTO file_changes (session_id, file_path, action, content) VALUES (?, ?, ?, ?)`,
      [sessionId, filePath, action, content]
    );
  }

  async createSnapshot(sessionId, name, description) {
    const snapshotId = `snapshot_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    await this.db.run(
      `INSERT INTO snapshots (id, session_id, name, description) VALUES (?, ?, ?, ?)`,
      [snapshotId, sessionId, name, description]
    );

    return snapshotId;
  }

  async getSessionHistory(sessionId) {
    const commands = await this.db.all(
      `SELECT * FROM command_history WHERE session_id = ? ORDER BY executed_at`,
      [sessionId]
    );

    const fileChanges = await this.db.all(
      `SELECT * FROM file_changes WHERE session_id = ? ORDER BY changed_at`,
      [sessionId]
    );

    return { commands, fileChanges };
  }

  async close() {
    if (this.db) {
      await this.db.close();
    }
  }
}