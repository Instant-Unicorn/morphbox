// Simple in-memory session store for agent persistence
// This allows resuming sessions from any device

export interface SessionData {
  sessionId: string;
  agentId: string;
  created: Date;
  lastAccessed: Date;
  outputBuffer: string[];
  metadata: {
    terminalSize: { cols: number; rows: number };
    workingDirectory: string;
  };
}

class SessionStore {
  private sessions: Map<string, SessionData> = new Map();
  private cleanupTimers: Map<string, NodeJS.Timeout> = new Map();
  private readonly SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
  private readonly MAX_BUFFER_SIZE = 100000; // Max characters to buffer

  createSession(sessionId: string, agentId: string, metadata: SessionData['metadata']): SessionData {
    const session: SessionData = {
      sessionId,
      agentId,
      created: new Date(),
      lastAccessed: new Date(),
      outputBuffer: [],
      metadata
    };

    this.sessions.set(sessionId, session);
    this.resetCleanupTimer(sessionId);
    
    console.log(`[SessionStore] Created session ${sessionId} for agent ${agentId}`);
    return session;
  }

  getSession(sessionId: string): SessionData | undefined {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastAccessed = new Date();
      this.resetCleanupTimer(sessionId);
    }
    return session;
  }

  updateSession(sessionId: string, updates: Partial<SessionData>): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      Object.assign(session, updates);
      session.lastAccessed = new Date();
      this.resetCleanupTimer(sessionId);
    }
  }

  addOutput(sessionId: string, output: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.outputBuffer.push(output);
      
      // Trim buffer if it gets too large
      const totalLength = session.outputBuffer.join('').length;
      if (totalLength > this.MAX_BUFFER_SIZE) {
        // Remove oldest entries until under limit
        while (session.outputBuffer.join('').length > this.MAX_BUFFER_SIZE && session.outputBuffer.length > 0) {
          session.outputBuffer.shift();
        }
      }
    }
  }

  getAndClearBuffer(sessionId: string): string[] {
    const session = this.sessions.get(sessionId);
    if (session) {
      const buffer = [...session.outputBuffer];
      session.outputBuffer = [];
      return buffer;
    }
    return [];
  }

  deleteSession(sessionId: string): void {
    this.sessions.delete(sessionId);
    const timer = this.cleanupTimers.get(sessionId);
    if (timer) {
      clearTimeout(timer);
      this.cleanupTimers.delete(sessionId);
    }
    console.log(`[SessionStore] Deleted session ${sessionId}`);
  }

  private resetCleanupTimer(sessionId: string): void {
    // Clear existing timer
    const existingTimer = this.cleanupTimers.get(sessionId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set new timer
    const timer = setTimeout(() => {
      console.log(`[SessionStore] Session ${sessionId} timed out, cleaning up`);
      this.deleteSession(sessionId);
      // Emit event so agent can be cleaned up
      this.emit('session-timeout', sessionId);
    }, this.SESSION_TIMEOUT);

    this.cleanupTimers.set(sessionId, timer);
  }

  // Event emitter functionality
  private listeners: Map<string, Function[]> = new Map();

  on(event: string, listener: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(listener);
  }

  off(event: string, listener: Function): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      const index = eventListeners.indexOf(listener);
      if (index > -1) {
        eventListeners.splice(index, 1);
      }
    }
  }

  private emit(event: string, ...args: any[]): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(listener => listener(...args));
    }
  }

  // Get all active sessions (for debugging/monitoring)
  getAllSessions(): SessionData[] {
    return Array.from(this.sessions.values());
  }
}

// Export singleton instance
export const sessionStore = new SessionStore();