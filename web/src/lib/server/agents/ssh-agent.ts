import { EventEmitter } from 'events';
import * as pty from 'node-pty';
import type { Agent, AgentOptions } from '../agent-manager';

export class SSHAgent extends EventEmitter implements Agent {
  id: string;
  type: string = 'ssh';
  status: string = 'initialized';
  startTime: number;
  private ptyProcess: pty.IPty | null = null;
  private options: AgentOptions;

  constructor(id: string, options: AgentOptions) {
    super();
    this.id = id;
    this.options = options;
    this.startTime = Date.now();
  }

  async initialize(): Promise<void> {
    const { vmHost, vmPort, vmUser } = this.options;

    if (!vmHost || !vmPort || !vmUser) {
      throw new Error('SSH connection requires vmHost, vmPort, and vmUser');
    }

    // SSH arguments with password support
    const args = [
      '-p', vmPort.toString(),
      '-o', 'StrictHostKeyChecking=no',
      '-o', 'UserKnownHostsFile=/dev/null',
      '-o', 'PreferredAuthentications=password,publickey',
      '-o', 'SendEnv=TERM COLORTERM',
      '-t',  // Force TTY allocation
      `${vmUser}@${vmHost}`,
      // Run Claude in the VM with proper terminal
      'bash -i -c "claude --dangerously-skip-permissions"'
    ];

    try {
      this.ptyProcess = pty.spawn('ssh', args, {
        name: 'xterm-256color',
        cols: 80,
        rows: 30,
        cwd: process.cwd(),
        env: {
          ...process.env,
          TERM: 'xterm-256color'
        } as any
      });

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
      
      // Auto-enter password for Docker container
      setTimeout(() => {
        if (this.ptyProcess) {
          this.ptyProcess.write('morphbox\r');
        }
      }, 1000);

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
    if (this.ptyProcess) {
      this.ptyProcess.kill();
      this.ptyProcess = null;
      this.status = 'stopped';
    }
  }

  async resize(cols: number, rows: number): Promise<void> {
    if (this.ptyProcess) {
      this.ptyProcess.resize(cols, rows);
    }
  }
}