import { EventEmitter } from 'events';
import * as pty from 'node-pty';
import type { Agent, AgentOptions } from '../agent-manager';
import { getPersistentSessionManager } from '../persistent-session-manager';
import type { PersistentSession } from '../persistent-session-manager';

export class PersistentSSHAgent extends EventEmitter implements Agent {
  id: string;
  type: string = 'persistent-ssh';
  status: string = 'initialized';
  startTime: number;
  private ptyProcess: pty.IPty | null = null;
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
    const { vmHost, vmPort, vmUser, terminalSessionId } = this.options;

    if (!vmHost || !vmPort || !vmUser) {
      throw new Error('SSH connection requires vmHost, vmPort, and vmUser');
    }

    try {
      // Check if we should reconnect to an existing session
      if (terminalSessionId) {
        const existingSession = this.sessionManager.getSession(terminalSessionId);
        if (existingSession && existingSession.status !== 'dead') {
          console.log(`Reconnecting to existing session: ${terminalSessionId}`);
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
              this.emit('output', '=== Reconnected to session ===\r\n');
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
        // Create a session with an interactive shell
        // We'll run the commands after the session is created
        this.persistentSession = await this.sessionManager.createSession({
          command: '/bin/bash',  // Start with interactive bash
          cwd: '/workspace',
          cols: 80,
          rows: 30
        });
        
        // Now switch to the user and run the commands
        const projectDirSetup = 'PROJECT_DIR=$(ls -d /workspace/*/ 2>/dev/null | head -n1 | xargs basename 2>/dev/null); cd /workspace/${PROJECT_DIR:-} 2>/dev/null || cd /workspace';
        const claudeCommand = 'claude --dangerously-skip-permissions --continue || claude --dangerously-skip-permissions';
        
        // Switch to the VM user
        await this.sessionManager.sendToSession(this.persistentSession.id, `su - ${vmUser}\n`);
        
        // Wait a bit for the su command to complete
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Run the setup commands
        await this.sessionManager.sendToSession(this.persistentSession.id, `${projectDirSetup}\n`);
        await this.sessionManager.sendToSession(this.persistentSession.id, `${claudeCommand}\n`);

        // Emit the new session ID
        this.emit('sessionId', this.persistentSession.id);
      }

      // Now attach to the session using docker exec
      const attachArgs = await this.sessionManager.attachToSession(this.persistentSession.id);
      
      const ptyOptions = {
        name: 'xterm-256color',
        cols: this.persistentSession.metadata.cols || 80,
        rows: this.persistentSession.metadata.rows || 30,
        env: {
          ...process.env,
          TERM: 'xterm-256color',
          COLORTERM: 'truecolor'
        } as any
      };

      // Spawn docker process to attach to the screen session
      this.ptyProcess = pty.spawn('docker', attachArgs, ptyOptions);

      // Handle output from PTY
      this.ptyProcess.onData((data: string) => {
        this.emit('output', data);
        
        // Update last activity
        if (this.persistentSession) {
          this.persistentSession.lastActivity = new Date();
        }
      });

      // Handle process exit (detachment)
      this.ptyProcess.onExit(({ exitCode }: { exitCode: number | undefined }) => {
        console.log('PTY process exited with code:', exitCode);
        
        // Mark session as detached, not dead
        if (this.persistentSession) {
          this.sessionManager.detachSession(this.persistentSession.id).catch(console.error);
        }
        
        this.status = 'stopped';
        this.emit('exit', exitCode ?? 0);
      });

      this.status = 'running';

      // If reconnecting, send a newline to refresh the prompt
      if (this.isReconnecting) {
        setTimeout(() => {
          this.sendInput('\n');
        }, 500);
      }

    } catch (error) {
      this.status = 'error';
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
    console.log('Stopping persistent SSH agent...');
    
    // Just detach from the session, don't kill it
    if (this.persistentSession) {
      await this.sessionManager.detachSession(this.persistentSession.id);
    }
    
    // Kill the PTY process (docker exec)
    if (this.ptyProcess) {
      this.ptyProcess.kill();
      this.ptyProcess = null;
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