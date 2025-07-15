import { EventEmitter } from 'events';
import * as pty from 'node-pty';
import type { Agent, AgentOptions } from '../agent-manager';
import { getSessionManager, type SessionInfo } from '../session-manager';

export class SSHAgent extends EventEmitter implements Agent {
  id: string;
  type: string = 'ssh';
  status: string = 'initialized';
  startTime: number;
  private ptyProcess: pty.IPty | null = null;
  private sessionInfo: SessionInfo | null = null;
  private sessionId: string | null = null;
  private options: AgentOptions;

  constructor(id: string, options: AgentOptions) {
    super();
    this.id = id;
    this.options = options;
    this.startTime = Date.now();
    
    // Check if a terminal session ID was provided for persistence
    if (options.terminalSessionId) {
      this.sessionId = options.terminalSessionId;
    }
  }

  setSessionId(sessionId: string | null): void {
    this.sessionId = sessionId;
  }

  async initialize(): Promise<void> {
    const { vmHost, vmPort, vmUser } = this.options;

    if (!vmHost || !vmPort || !vmUser) {
      throw new Error('SSH connection requires vmHost, vmPort, and vmUser');
    }

    // Use docker exec without tmux for now
    const args = [
      'exec',
      '-it',
      'morphbox-vm',
      'su', '-', vmUser, '-c',
      'cd /workspace && claude --dangerously-skip-permissions'
    ];

    const ptyOptions = {
      name: 'xterm-256color',
      cols: 80,
      rows: 30,
      cwd: process.cwd(),
      env: {
        ...process.env,
        TERM: 'xterm-256color'
      } as any
    };

    try {
      // Get the session manager
      const sessionManager = getSessionManager();
      
      // Try to attach to existing session or create new one
      this.sessionInfo = sessionManager.attachOrCreateSession(
        this.sessionId,
        {
          command: 'docker',
          args,
          options: ptyOptions,
          metadata: {
            agentId: this.id,
            vmUser,
            createdAt: new Date()
          }
        }
      );

      // Update our references
      this.sessionId = this.sessionInfo.id;
      this.ptyProcess = this.sessionInfo.pty;

      // Emit the session ID so the client can store it
      this.emit('sessionId', this.sessionId);

      // Handle output from PTY
      this.ptyProcess.onData((data) => {
        this.emit('output', data);
      });

      // Handle process exit
      this.ptyProcess.onExit(({ exitCode }) => {
        console.log('SSH session exited with code:', exitCode);
        this.status = 'stopped';
        this.emit('exit', exitCode || 0);
      });

      this.status = 'running';

    } catch (error) {
      this.status = 'error';
      throw error;
    }
  }

  async sendInput(input: string): Promise<void> {
    if (this.ptyProcess) {
      this.ptyProcess.write(input);
    } else {
      throw new Error('SSH process not running');
    }
  }

  async stop(): Promise<void> {
    // Don't kill the PTY process - just disconnect from it
    // The session manager will handle cleanup based on timeout
    if (this.ptyProcess) {
      // Remove our event listeners
      this.ptyProcess.removeAllListeners();
      this.ptyProcess = null;
      this.sessionInfo = null;
      this.status = 'stopped';
      
      console.log(`[SSHAgent] Disconnected from session ${this.sessionId}, but keeping it alive`);
    }
  }

  async resize(cols: number, rows: number): Promise<void> {
    if (this.ptyProcess) {
      this.ptyProcess.resize(cols, rows);
    }
  }
  
  static async listSessions(): Promise<string[]> {
    return new Promise((resolve, reject) => {
      const { exec } = require('child_process');
      exec('docker exec morphbox-vm tmux list-sessions 2>/dev/null', (error: any, stdout: string) => {
        if (error || !stdout) {
          resolve([]);
          return;
        }
        
        const sessions = stdout
          .trim()
          .split('\n')
          .filter(line => line.includes('morphbox-'))
          .map(line => line.split(':')[0]);
        
        resolve(sessions);
      });
    });
  }
}