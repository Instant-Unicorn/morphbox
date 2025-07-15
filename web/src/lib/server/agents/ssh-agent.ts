import { EventEmitter } from 'events';
import pty from 'node-pty';
import type { Agent, AgentOptions } from '../agent-manager';
// import { screenManager } from '../screen-manager';

export class SSHAgent extends EventEmitter implements Agent {
  id: string;
  type: string = 'ssh';
  status: string = 'initialized';
  startTime: number;
  private ptyProcess: InstanceType<typeof pty.spawn> | null = null;
  private screenPty: InstanceType<typeof pty.spawn> | null = null;
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

    // Use docker exec with Claude's resume feature
    let claudeCommand = 'cd /workspace && claude --dangerously-skip-permissions';
    
    // If we have a session ID, use Claude's --resume flag
    if (this.sessionId && this.sessionId.startsWith('claude-')) {
      // Extract the Claude session ID (remove our prefix)
      const claudeSessionId = this.sessionId.replace('claude-', '');
      claudeCommand = `cd /workspace && claude --dangerously-skip-permissions --resume ${claudeSessionId}`;
      console.log(`Resuming Claude session: ${claudeSessionId}`);
    }
    
    const args = [
      'exec',
      '-it',
      'morphbox-vm',
      'su', '-', vmUser, '-c',
      claudeCommand
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
      // Use direct PTY
      this.ptyProcess = pty.spawn('docker', args, ptyOptions);
      
      // We'll extract Claude's session ID from its output

      // Emit the session ID so the client can store it
      this.emit('sessionId', this.sessionId);

      // Handle output from PTY
      this.ptyProcess.onData((data) => {
        // Look for Claude's session ID in the output
        // Claude outputs something like "Session ID: abc123def456"
        const sessionMatch = data.match(/Session ID: ([a-zA-Z0-9-]+)/i);
        if (sessionMatch && sessionMatch[1]) {
          const claudeSessionId = sessionMatch[1];
          this.sessionId = `claude-${claudeSessionId}`;
          console.log(`Detected Claude session ID: ${claudeSessionId}`);
          this.emit('sessionId', this.sessionId);
        }
        
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
    // Clean up PTY process
    if (this.ptyProcess) {
      this.ptyProcess.removeAllListeners();
      this.ptyProcess.kill();
      this.ptyProcess = null;
      this.screenPty = null;
      this.status = 'stopped';
      
      console.log(`[SSHAgent] Disconnected from session ${this.sessionId}`);
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