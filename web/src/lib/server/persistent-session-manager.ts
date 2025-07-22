import { EventEmitter } from 'events';
import { exec } from 'child_process';
import { promisify } from 'util';
import crypto from 'crypto';

const execAsync = promisify(exec);

export interface PersistentSession {
  id: string;
  type: 'screen' | 'tmux' | 'direct';
  containerName: string;
  sessionName: string;
  createdAt: Date;
  lastActivity: Date;
  status: 'active' | 'detached' | 'dead';
  metadata: {
    cols?: number;
    rows?: number;
    command?: string;
    cwd?: string;
  };
}

export class PersistentSessionManager extends EventEmitter {
  private sessions: Map<string, PersistentSession> = new Map();
  private containerName: string = 'morphbox-vm';
  private sessionCheckInterval: NodeJS.Timeout | null = null;

  constructor() {
    super();
    // Check session health periodically
    this.sessionCheckInterval = setInterval(() => {
      this.checkSessionHealth();
    }, 30000); // Every 30 seconds
  }

  async initialize(): Promise<void> {
    // Ensure screen is installed in the container
    try {
      await execAsync(`docker exec ${this.containerName} which screen`);
      console.log('✅ GNU Screen is available in container');
    } catch (error) {
      console.warn('⚠️ GNU Screen not found in container, installing...');
      try {
        await execAsync(`docker exec -u root ${this.containerName} bash -c "apt-get update && apt-get install -y screen"`);
        console.log('✅ GNU Screen installed successfully');
      } catch (installError) {
        console.error('❌ Failed to install GNU Screen:', installError);
        throw new Error('Screen is required for persistent sessions');
      }
    }

    // Load existing sessions
    await this.loadExistingSessions();
  }

  /**
   * Create a new persistent session
   */
  async createSession(options: {
    command?: string;
    cwd?: string;
    cols?: number;
    rows?: number;
  }): Promise<PersistentSession> {
    const sessionId = this.generateSessionId();
    const sessionName = `morphbox-${sessionId}`;
    
    // Default to bash if no command specified
    const command = options.command || '/bin/bash';
    const cwd = options.cwd || '/workspace';
    
    // Create screen session with proper environment
    // Note: We run bash interactively and then execute the command within it
    // This ensures the session persists after the command completes
    const screenCmd = [
      'screen',
      '-dmS', sessionName,  // Create detached session
      '-h', '10000',        // Set scrollback buffer
      'bash'                  // Run interactive bash shell
    ].join(' ');

    try {
      await execAsync(`docker exec ${this.containerName} ${screenCmd}`);
      
      const session: PersistentSession = {
        id: sessionId,
        type: 'screen',
        containerName: this.containerName,
        sessionName,
        createdAt: new Date(),
        lastActivity: new Date(),
        status: 'detached',
        metadata: {
          cols: options.cols || 80,
          rows: options.rows || 24,
          command,
          cwd
        }
      };

      this.sessions.set(sessionId, session);
      
      // If a specific command was requested, execute it in the session
      if (options.command && options.command !== '/bin/bash') {
        // First, change to the working directory
        if (cwd !== '/' && cwd !== '/workspace') {
          await this.sendToSession(sessionId, `cd ${cwd}\n`);
        }
        // Then execute the command
        await this.sendToSession(sessionId, `${command}\n`);
      }
      
      this.emit('sessionCreated', session);
      
      console.log(`Created persistent session: ${sessionName}`);
      return session;
    } catch (error) {
      console.error('Failed to create screen session:', error);
      throw new Error('Failed to create persistent session');
    }
  }

  /**
   * Attach to an existing session
   */
  async attachToSession(sessionId: string): Promise<string[]> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    // Update session status
    session.status = 'active';
    session.lastActivity = new Date();

    // Return the command arguments to attach to the screen session
    // Note: We use -t only (not -it) because node-pty provides the input stream
    return [
      'exec',
      '-t',
      this.containerName,
      'screen',
      '-r', session.sessionName  // Resume session
    ];
  }

  /**
   * Send input to a detached session
   */
  async sendToSession(sessionId: string, input: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    // Use screen's stuff command to send input
    const escapedInput = input.replace(/'/g, "'\\''");
    const cmd = `docker exec ${this.containerName} screen -S ${session.sessionName} -X stuff '${escapedInput}'`;
    
    try {
      await execAsync(cmd);
      session.lastActivity = new Date();
    } catch (error) {
      console.error('Failed to send input to session:', error);
      throw error;
    }
  }

  /**
   * Detach from a session (keeping it running)
   */
  async detachSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    session.status = 'detached';
    this.emit('sessionDetached', session);
  }

  /**
   * Kill a session completely
   */
  async killSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return; // Already gone
    }

    try {
      await execAsync(`docker exec ${this.containerName} screen -S ${session.sessionName} -X quit`);
    } catch (error) {
      // Session might already be dead
      console.warn(`Failed to kill session ${sessionId}:`, error);
    }

    session.status = 'dead';
    this.sessions.delete(sessionId);
    this.emit('sessionKilled', session);
  }

  /**
   * Get session output (from scrollback buffer)
   */
  async getSessionOutput(sessionId: string, lines: number = 100): Promise<string> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    try {
      // Use screen's hardcopy command to get output
      const tempFile = `/tmp/screen-output-${sessionId}`;
      await execAsync(`docker exec ${this.containerName} screen -S ${session.sessionName} -X hardcopy ${tempFile}`);
      const { stdout } = await execAsync(`docker exec ${this.containerName} tail -n ${lines} ${tempFile}`);
      await execAsync(`docker exec ${this.containerName} rm -f ${tempFile}`);
      return stdout;
    } catch (error) {
      console.error('Failed to get session output:', error);
      return '';
    }
  }

  /**
   * List all sessions
   */
  listSessions(): PersistentSession[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Get a specific session
   */
  getSession(sessionId: string): PersistentSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Resize a session
   */
  async resizeSession(sessionId: string, cols: number, rows: number): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    // Update metadata
    session.metadata.cols = cols;
    session.metadata.rows = rows;

    // Send resize command to screen
    try {
      await execAsync(`docker exec ${this.containerName} screen -S ${session.sessionName} -X width ${cols} ${rows}`);
    } catch (error) {
      console.warn('Failed to resize screen session:', error);
    }
  }

  /**
   * Load existing sessions from the container
   */
  private async loadExistingSessions(): Promise<void> {
    try {
      const { stdout } = await execAsync(`docker exec ${this.containerName} screen -ls | grep morphbox- || true`);
      
      if (!stdout.trim()) {
        console.log('No existing screen sessions found');
        return;
      }

      const lines = stdout.trim().split('\n');
      for (const line of lines) {
        const match = line.match(/\s+(\d+\.morphbox-[a-z0-9]+)\s+\((Attached|Detached)\)/);
        if (match) {
          const fullName = match[1];
          const status = match[2].toLowerCase() as 'attached' | 'detached';
          const sessionName = fullName.split('.')[1];
          const sessionId = sessionName.replace('morphbox-', '');

          const session: PersistentSession = {
            id: sessionId,
            type: 'screen',
            containerName: this.containerName,
            sessionName,
            createdAt: new Date(), // We don't know the actual creation time
            lastActivity: new Date(),
            status: status === 'attached' ? 'active' : 'detached',
            metadata: {}
          };

          this.sessions.set(sessionId, session);
          console.log(`Loaded existing session: ${sessionName} (${status})`);
        }
      }
    } catch (error) {
      console.error('Failed to load existing sessions:', error);
    }
  }

  /**
   * Check health of all sessions
   */
  private async checkSessionHealth(): Promise<void> {
    for (const [sessionId, session] of this.sessions) {
      try {
        const { stdout } = await execAsync(
          `docker exec ${this.containerName} screen -ls | grep ${session.sessionName} || echo "NOT_FOUND"`
        );

        if (stdout.includes('NOT_FOUND')) {
          // Session no longer exists
          session.status = 'dead';
          this.sessions.delete(sessionId);
          this.emit('sessionDied', session);
        } else if (stdout.includes('Attached')) {
          session.status = 'active';
        } else if (stdout.includes('Detached')) {
          session.status = 'detached';
        }
      } catch (error) {
        console.error(`Failed to check health of session ${sessionId}:`, error);
      }
    }
  }

  /**
   * Generate a unique session ID
   */
  private generateSessionId(): string {
    return crypto.randomBytes(6).toString('hex');
  }

  /**
   * Cleanup
   */
  destroy(): void {
    if (this.sessionCheckInterval) {
      clearInterval(this.sessionCheckInterval);
      this.sessionCheckInterval = null;
    }
  }
}

// Singleton instance
let sessionManager: PersistentSessionManager | null = null;

export function getPersistentSessionManager(): PersistentSessionManager {
  if (!sessionManager) {
    sessionManager = new PersistentSessionManager();
  }
  return sessionManager;
}