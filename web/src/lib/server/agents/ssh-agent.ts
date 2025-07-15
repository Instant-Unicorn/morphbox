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
  private claudePid: number | null = null;
  private containerClaudePid: string | null = null;

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

    // Check for existing Claude processes first
    const existingProcesses = await SSHAgent.getExistingClaudeProcesses();
    const maxProcesses = parseInt(process.env.MAX_CLAUDE_PROCESSES || '10'); // Default to 10 for multiple terminals
    
    if (existingProcesses.length >= maxProcesses) {
      console.log(`Found ${existingProcesses.length} existing Claude process(es). At limit of ${maxProcesses}.`);
      // Kill the oldest process to make room for the new one
      console.log(`Killing oldest process: ${existingProcesses[0].pid}`);
      await this.killContainerProcess(existingProcesses[0].pid);
      // Wait a bit for process to die
      await new Promise(resolve => setTimeout(resolve, 500));
    } else if (existingProcesses.length > 0) {
      console.log(`Found ${existingProcesses.length} existing Claude process(es). Maximum allowed is ${maxProcesses}.`);
    }

    // Use docker exec without tmux for now
    const args = [
      'exec',
      '-it',
      'morphbox-vm',
      'su', '-', vmUser, '-c',
      'cd /workspace && claude --dangerously-skip-permissions'
    ];

    try {
      this.ptyProcess = pty.spawn('docker', args, {
        name: 'xterm-256color',
        cols: 80,
        rows: 30,
        cwd: process.cwd(),
        env: {
          ...process.env,
          TERM: 'xterm-256color'
        } as any
      });

      // Store the PTY process PID
      this.claudePid = this.ptyProcess.pid;

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

      // Capture the actual Claude PID inside the container
      this.captureClaudePid();

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
    console.log('Stopping SSH agent...');
    
    // First, try to kill the Claude process inside the container
    if (this.containerClaudePid) {
      console.log(`Killing Claude process ${this.containerClaudePid} in container...`);
      await this.killContainerProcess(this.containerClaudePid);
      
      // Give it a moment to clean up
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Then kill the PTY process
    if (this.ptyProcess) {
      console.log('Killing PTY process...');
      this.ptyProcess.kill();
      this.ptyProcess = null;
    }
    
    this.status = 'stopped';
    this.containerClaudePid = null;
    this.claudePid = null;
  }

  private async killContainerProcess(pid: string): Promise<void> {
    return new Promise((resolve) => {
      const { exec } = require('child_process');
      exec(`docker exec morphbox-vm kill -9 ${pid}`, (error: any) => {
        if (error) {
          console.error(`Failed to kill process ${pid}:`, error.message);
        } else {
          console.log(`Successfully killed process ${pid}`);
        }
        resolve();
      });
    });
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

  static async getExistingClaudeProcesses(): Promise<Array<{pid: string, cmd: string}>> {
    return new Promise((resolve) => {
      const { exec } = require('child_process');
      // Look for claude processes in the container
      exec('docker exec morphbox-vm ps aux | grep -E "claude.*dangerously-skip-permissions" | grep -v grep', 
        (error: any, stdout: string) => {
          if (error || !stdout) {
            resolve([]);
            return;
          }
          
          const processes = stdout
            .trim()
            .split('\n')
            .map(line => {
              const parts = line.split(/\s+/);
              return {
                pid: parts[1],
                cmd: parts.slice(10).join(' ')
              };
            })
            .filter(p => p.pid && p.cmd);
          
          resolve(processes);
        });
    });
  }

  private async captureClaudePid(): Promise<void> {
    // Wait a bit for the process to start
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const processes = await SSHAgent.getExistingClaudeProcesses();
    if (processes.length > 0) {
      // Get the most recently started process
      this.containerClaudePid = processes[processes.length - 1].pid;
      console.log(`Captured Claude process PID in container: ${this.containerClaudePid}`);
    }
  }
}