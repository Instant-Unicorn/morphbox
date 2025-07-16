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
      const dockerArgs = [
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
      });

      // Handle PTY exit
      this.pty.onExit(({ exitCode }) => {
        console.log(`Bash agent ${this.id} exited with code:`, exitCode);
        this.status = 'stopped';
        this.emit('exit', exitCode);
      });

      this.status = 'running';
      
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