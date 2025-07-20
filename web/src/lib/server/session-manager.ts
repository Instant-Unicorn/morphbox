// Session manager stub - implement as needed
export interface Session {
  id: string;
  createdAt: Date;
  lastActivity: Date;
  agentId?: string;
}

class SessionManager {
  private sessions: Map<string, Session> = new Map();

  listSessions(): Session[] {
    return Array.from(this.sessions.values());
  }

  closeSession(sessionId: string): boolean {
    return this.sessions.delete(sessionId);
  }

  createSession(sessionId: string): Session {
    const session: Session = {
      id: sessionId,
      createdAt: new Date(),
      lastActivity: new Date()
    };
    this.sessions.set(sessionId, session);
    return session;
  }

  getSession(sessionId: string): Session | undefined {
    return this.sessions.get(sessionId);
  }
}

let sessionManager: SessionManager;

export function getSessionManager(): SessionManager {
  if (!sessionManager) {
    sessionManager = new SessionManager();
  }
  return sessionManager;
}