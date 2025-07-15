/**
 * PTY Session Manager for Terminal Persistence
 * 
 * Manages persistent PTY processes for Claude sessions, allowing
 * WebSocket reconnection without losing terminal context.
 */

import { spawn, IPty } from 'node-pty';
import { EventEmitter } from 'events';
import crypto from 'crypto';

export interface SessionInfo {
  id: string;
  pty: IPty;
  createdAt: Date;
  lastActivity: Date;
  userId?: string;
  metadata?: Record<string, any>;
}

export interface SessionManagerOptions {
  sessionTimeout?: number; // Milliseconds before cleaning up inactive sessions
  maxSessions?: number;    // Maximum number of concurrent sessions
  cleanupInterval?: number; // How often to run cleanup (milliseconds)
}

export class PTYSessionManager extends EventEmitter {
  private sessions: Map<string, SessionInfo> = new Map();
  private cleanupTimer?: NodeJS.Timer;
  private options: Required<SessionManagerOptions>;

  constructor(options: SessionManagerOptions = {}) {
    super();
    
    this.options = {
      sessionTimeout: options.sessionTimeout || 30 * 60 * 1000, // 30 minutes default
      maxSessions: options.maxSessions || 100,
      cleanupInterval: options.cleanupInterval || 5 * 60 * 1000 // 5 minutes
    };

    // Start cleanup timer
    this.startCleanupTimer();
  }

  /**
   * Create a new PTY session
   */
  createSession(
    command: string,
    args: string[],
    options: any,
    metadata?: Record<string, any>
  ): SessionInfo {
    // Check if we're at max capacity
    if (this.sessions.size >= this.options.maxSessions) {
      // Clean up oldest inactive session
      this.cleanupOldestInactive();
    }

    const sessionId = this.generateSessionId();
    const pty = spawn(command, args, {
      ...options,
      handleFlowControl: true
    });

    const sessionInfo: SessionInfo = {
      id: sessionId,
      pty,
      createdAt: new Date(),
      lastActivity: new Date(),
      metadata
    };

    this.sessions.set(sessionId, sessionInfo);
    
    // Set up PTY event handlers
    this.setupPTYHandlers(sessionInfo);
    
    this.emit('sessionCreated', sessionId);
    console.log(`[SessionManager] Created session ${sessionId}`);
    
    return sessionInfo;
  }

  /**
   * Get an existing session
   */
  getSession(sessionId: string): SessionInfo | undefined {
    const session = this.sessions.get(sessionId);
    if (session) {
      // Update last activity
      session.lastActivity = new Date();
    }
    return session;
  }

  /**
   * Attach to an existing session or create a new one
   */
  attachOrCreateSession(
    sessionId: string | null,
    createOptions: {
      command: string;
      args: string[];
      options: any;
      metadata?: Record<string, any>;
    }
  ): SessionInfo {
    // Try to get existing session
    if (sessionId) {
      const existingSession = this.getSession(sessionId);
      if (existingSession && !existingSession.pty.process.exitCode) {
        console.log(`[SessionManager] Reattaching to session ${sessionId}`);
        return existingSession;
      }
    }

    // Create new session if no valid existing session
    console.log(`[SessionManager] Creating new session`);
    return this.createSession(
      createOptions.command,
      createOptions.args,
      createOptions.options,
      createOptions.metadata
    );
  }

  /**
   * Close a session
   */
  closeSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (session) {
      try {
        session.pty.kill();
      } catch (error) {
        console.error(`[SessionManager] Error killing PTY for session ${sessionId}:`, error);
      }
      this.sessions.delete(sessionId);
      this.emit('sessionClosed', sessionId);
      console.log(`[SessionManager] Closed session ${sessionId}`);
      return true;
    }
    return false;
  }

  /**
   * List all active sessions
   */
  listSessions(): Array<{
    id: string;
    createdAt: Date;
    lastActivity: Date;
    metadata?: Record<string, any>;
  }> {
    return Array.from(this.sessions.entries()).map(([id, session]) => ({
      id,
      createdAt: session.createdAt,
      lastActivity: session.lastActivity,
      metadata: session.metadata
    }));
  }

  /**
   * Clean up expired sessions
   */
  cleanupExpiredSessions(): number {
    const now = new Date();
    let cleaned = 0;

    for (const [sessionId, session] of this.sessions.entries()) {
      const inactiveTime = now.getTime() - session.lastActivity.getTime();
      
      // Check if session is expired or PTY is dead
      if (inactiveTime > this.options.sessionTimeout || session.pty.process.exitCode !== null) {
        this.closeSession(sessionId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`[SessionManager] Cleaned up ${cleaned} expired sessions`);
    }

    return cleaned;
  }

  /**
   * Destroy the session manager
   */
  destroy(): void {
    // Stop cleanup timer
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    // Close all sessions
    for (const sessionId of this.sessions.keys()) {
      this.closeSession(sessionId);
    }

    this.removeAllListeners();
  }

  private generateSessionId(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupExpiredSessions();
    }, this.options.cleanupInterval);
  }

  private cleanupOldestInactive(): void {
    let oldestSession: { id: string; lastActivity: Date } | null = null;

    for (const [id, session] of this.sessions.entries()) {
      if (!oldestSession || session.lastActivity < oldestSession.lastActivity) {
        oldestSession = { id, lastActivity: session.lastActivity };
      }
    }

    if (oldestSession) {
      console.log(`[SessionManager] Removing oldest inactive session ${oldestSession.id}`);
      this.closeSession(oldestSession.id);
    }
  }

  private setupPTYHandlers(session: SessionInfo): void {
    const { pty, id } = session;

    // Clean up on PTY exit
    pty.onExit(({ exitCode, signal }) => {
      console.log(`[SessionManager] PTY exited for session ${id}: code=${exitCode}, signal=${signal}`);
      this.sessions.delete(id);
      this.emit('sessionExited', id, exitCode, signal);
    });
  }
}

// Singleton instance
let sessionManager: PTYSessionManager | null = null;

export function getSessionManager(options?: SessionManagerOptions): PTYSessionManager {
  if (!sessionManager) {
    sessionManager = new PTYSessionManager(options);
  }
  return sessionManager;
}

export function destroySessionManager(): void {
  if (sessionManager) {
    sessionManager.destroy();
    sessionManager = null;
  }
}