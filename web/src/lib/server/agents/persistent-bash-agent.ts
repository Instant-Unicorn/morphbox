import { EventEmitter } from 'events';
import * as pty from 'node-pty';
import type { Agent, AgentOptions } from '../agent-manager';
import { getPersistentSessionManager } from '../persistent-session-manager';
import type { PersistentSession } from '../persistent-session-manager';

export class PersistentBashAgent extends EventEmitter implements Agent {
  id: string;
  type: string = 'persistent-bash';
  status: string = 'initializing';
  startTime: number;
  private ptyProcess?: pty.IPty;
  private persistentSession: PersistentSession | null = null;
  private sessionManager = getPersistentSessionManager();
  private options: AgentOptions;
  private isReconnecting: boolean = false;

  constructor(id: string, options: AgentOptions) {
    super();
    this.id = id;
    this.options = options;
    this.startTime = Date.now();
  }

  async initialize(): Promise<void> {
    try {
      const { terminalSessionId } = this.options;
      
      // Check if we should reconnect to an existing session
      if (terminalSessionId) {
        const existingSession = this.sessionManager.getSession(terminalSessionId);
        if (existingSession && existingSession.status !== 'dead') {
          console.log(`Reconnecting to existing bash session: ${terminalSessionId}`);
          this.isReconnecting = true;
          this.persistentSession = existingSession;
          
          // Emit the session ID for reconnection
          this.emit('sessionId', terminalSessionId);
          
          // Get recent output from the session
          try {
            const recentOutput = await this.sessionManager.getSessionOutput(terminalSessionId, 50);
            if (recentOutput) {
              // Clear screen and show recent output
              this.emit('output', '\x1b[2J\x1b[H'); // Clear screen
              this.emit('output', '=== Reconnected to bash session ===\r\n');
              this.emit('output', recentOutput);
              this.emit('output', '\r\n=== End of recent output ===\r\n');
            }
          } catch (error) {
            console.warn('Could not retrieve recent output:', error);
          }
        } else {
          console.log(`Session ${terminalSessionId} not found or dead, creating new session`);
        }
      }

      // Create a new persistent session if needed
      if (!this.persistentSession) {
        this.persistentSession = await this.sessionManager.createSession({
          command: '/bin/bash',
          cwd: '/workspace',
          cols: 80,
          rows: 24
        });

        // Emit the new session ID
        this.emit('sessionId', this.persistentSession.id);
      }

      // Now attach to the session using docker exec
      const attachArgs = await this.sessionManager.attachToSession(this.persistentSession.id);
      
      console.log('Attaching to persistent bash session with args:', attachArgs);
      
      this.ptyProcess = pty.spawn('docker', attachArgs, {
        name: 'xterm-256color',
        env: {
          ...process.env,
          TERM: 'xterm-256color',
          COLORTERM: 'truecolor'
        },
        cols: this.persistentSession.metadata.cols || 80,
        rows: this.persistentSession.metadata.rows || 24
      });

      // Handle PTY output
      this.ptyProcess.onData((data) => {
        this.emit('output', data);
        
        // Update last activity
        if (this.persistentSession) {
          this.persistentSession.lastActivity = new Date();
        }
      });

      // Handle PTY exit (detachment)
      this.ptyProcess.onExit(({ exitCode }) => {
        console.log(`Bash PTY process exited with code:`, exitCode);
        
        // Mark session as detached, not dead
        if (this.persistentSession) {
          this.sessionManager.detachSession(this.persistentSession.id).catch(console.error);
        }
        
        this.status = 'stopped';
        this.emit('exit', exitCode);
      });

      this.status = 'running';
      
      // If reconnecting, send a newline to refresh the prompt
      if (this.isReconnecting) {
        setTimeout(() => {
          this.sendInput('\n');
        }, 500);
      }
      
      console.log(`Persistent bash agent ${this.id} initialized successfully`);
    } catch (error) {
      this.status = 'error';
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.emit('error', errorMessage);
      throw error;
    }
  }

  async sendInput(input: string): Promise<void> {
    if (this.ptyProcess) {
      this.ptyProcess.write(input);
    } else if (this.persistentSession) {
      // If PTY is not active, send to the detached session
      await this.sessionManager.sendToSession(this.persistentSession.id, input);
    } else {
      throw new Error('No active session');
    }
  }

  async stop(): Promise<void> {
    console.log(`Stopping persistent bash agent ${this.id}...`);
    
    // Just detach from the session, don't kill it
    if (this.persistentSession) {
      await this.sessionManager.detachSession(this.persistentSession.id);
    }
    
    // Kill the PTY process (docker exec)
    if (this.ptyProcess) {
      this.ptyProcess.kill();
      this.ptyProcess = undefined;
    }
    
    this.status = 'stopped';
  }

  async resize(cols: number, rows: number): Promise<void> {
    // Resize the PTY
    if (this.ptyProcess) {
      this.ptyProcess.resize(cols, rows);
    }
    
    // Update the persistent session metadata
    if (this.persistentSession) {
      await this.sessionManager.resizeSession(this.persistentSession.id, cols, rows);
    }
  }

  /**
   * Permanently kill the session (use with caution)
   */
  async killSession(): Promise<void> {
    if (this.persistentSession) {
      await this.sessionManager.killSession(this.persistentSession.id);
      this.persistentSession = null;
    }
    await this.stop();
  }

  /**
   * Get session information
   */
  getSessionInfo(): PersistentSession | null {
    return this.persistentSession;
  }
}