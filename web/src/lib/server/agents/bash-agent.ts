import { EventEmitter } from 'events';
import * as pty from 'node-pty';
import type { Agent, AgentOptions } from '../agent-manager';

export class BashAgent extends EventEmitter implements Agent {
  id: string;
  type: string = 'bash';
  status: string = 'initializing';
  startTime: number;
  private pty?: pty.IPty;
  private options: AgentOptions;

  constructor(id: string, options: AgentOptions) {
    super();
    this.id = id;
    this.options = options;
    this.startTime = Date.now();
  }

  async initialize(): Promise<void> {
    try {
      // Create a PTY for the bash shell
      console.log('Creating bash PTY with options:', {
        cwd: this.options.workspacePath || process.env.HOME || '/',
        cols: 80,
        rows: 24
      });
      
      // SECURITY: Use Docker container for isolation
      // The workspace is mounted at /workspace in the container
      const workDir = '/workspace';

      // If vmUser is specified, run as that user (needed for Claude with --dangerously-skip-permissions)
      // Claude Code won't allow --dangerously-skip-permissions when running as root
      const dockerArgs = this.options.vmUser
        ? [
            'exec',
            '-it',
            'morphbox-vm',
            'su', '-', this.options.vmUser, '-c',
            `cd ${workDir} && /bin/bash -i`
          ]
        : [
            'exec',
            '-it',
            '-w', workDir,  // Set working directory in container
            'morphbox-vm',
            '/bin/bash',
            '-i'
          ];
      
      console.log('Spawning containerized bash with args:', dockerArgs);
      
      this.pty = pty.spawn('docker', dockerArgs, {
        name: 'xterm-256color',
        env: {
          ...process.env,
          TERM: 'xterm-256color',
          COLORTERM: 'truecolor'
        },
        cols: 80,
        rows: 24
      });

      // Handle PTY output
      this.pty.onData((data) => {
        console.log(`Bash agent ${this.id} output:`, data);
        this.emit('output', data);

        // Parse Claude Code token usage from output
        const tokenMatch = data.match(/Token usage: (\d+)\/(\d+); (\d+) remaining/);
        if (tokenMatch) {
          const used = parseInt(tokenMatch[1]);
          const total = parseInt(tokenMatch[2]);
          const remaining = parseInt(tokenMatch[3]);

          console.log(`[BashAgent] Parsed token usage: ${used}/${total} (${remaining} remaining)`);

          this.emit('context-usage', {
            used,
            total,
            remaining,
            percentage: Math.round((used / total) * 100)
          });
        }
      });

      // Handle PTY exit
      this.pty.onExit(({ exitCode }) => {
        console.log(`Bash agent ${this.id} exited with code:`, exitCode);
        this.status = 'stopped';
        this.emit('exit', exitCode);
      });

      this.status = 'running';

      // Disable echo to prevent double text in terminal
      // BUT: Don't do this for non-root users (like morphbox) because Claude needs echo
      // Wait a small moment for the shell to be ready
      if (!this.options.vmUser) {
        setTimeout(() => {
          if (this.pty && this.status === 'running') {
            // Use a more robust approach: send the command with control characters
            // to minimize visibility
            this.pty.write(' stty -echo 2>/dev/null; clear\n');
          }
        }, 100);
      }

      console.log(`Bash agent ${this.id} initialized successfully`);
    } catch (error) {
      this.status = 'error';
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.emit('error', errorMessage);
      throw error;
    }
  }

  async sendInput(input: string): Promise<void> {
    if (!this.pty) {
      throw new Error('PTY not initialized');
    }
    
    this.pty.write(input);
  }

  async stop(): Promise<void> {
    if (this.pty) {
      this.pty.kill();
      this.pty = undefined;
    }
    this.status = 'stopped';
    console.log(`Bash agent ${this.id} stopped`);
  }

  async resize(cols: number, rows: number): Promise<void> {
    if (this.pty) {
      this.pty.resize(cols, rows);
    }
  }
}