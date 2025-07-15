import { EventEmitter } from 'events';
import * as pty from 'node-pty';
import type { Agent, AgentOptions } from '../agent-manager';
import { screenManager } from '../screen-manager';

export class SSHAgent extends EventEmitter implements Agent {
  id: string;
  type: string = 'ssh';
  status: string = 'initialized';
  startTime: number;
  private ptyProcess: pty.IPty | null = null;
  private screenPty: pty.IPty | null = null;
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
      // Generate session ID if not provided
      if (!this.sessionId) {
        this.sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      }
      
      // Use screen manager for persistent sessions
      this.screenPty = screenManager.attachOrCreateSession(
        this.sessionId,
        {
          command: 'docker',
          args,
          options: ptyOptions
        }
      );

      this.ptyProcess = this.screenPty;

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
    // Detach from screen session instead of killing it
    if (this.sessionId) {
      screenManager.detachSession(this.sessionId);
      
      if (this.ptyProcess) {
        this.ptyProcess.removeAllListeners();
        this.ptyProcess = null;
      }
      
      this.screenPty = null;
      this.status = 'stopped';
      
      console.log(`[SSHAgent] Detached from screen session ${this.sessionId}`);
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
      exec('screen -ls | grep morphbox-', (error: any, stdout: string) => {
        if (error || !stdout) {
          resolve([]);
          return;
        }
        
        const sessions = stdout
          .trim()
          .split('\n')
          .map(line => {
            const match = line.match(/\d+\.morphbox-([a-zA-Z0-9-]+)/);
            return match ? match[1] : null;
          })
          .filter(Boolean) as string[];
        
        resolve(sessions);
      });
    });
  }
}