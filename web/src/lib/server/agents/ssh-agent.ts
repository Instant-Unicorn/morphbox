import { EventEmitter } from 'events';
import * as pty from 'node-pty';
import { exec } from 'child_process';
import { promisify } from 'util';
import type { Agent, AgentOptions } from '../agent-manager';
// import { tmuxContainerManager } from '../tmux-container-manager';

const execAsync = promisify(exec);

export class SSHAgent extends EventEmitter implements Agent {
  id: string;
  type: string = 'ssh';
  status: string = 'initialized';
  startTime: number;
  private ptyProcess: InstanceType<typeof pty.spawn> | null = null;
  private sessionId: string | null = null;
  private options: AgentOptions;
  private claudePid: number | null = null;
  private containerClaudePid: string | null = null;

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
      'cd /workspace && claude --dangerously-skip-permissions --continue'
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
      // For now, disable tmux to fix visual issues
      this.ptyProcess = pty.spawn('docker', args, ptyOptions);
      
      // Generate session ID if not provided
      if (!this.sessionId) {
        this.sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      }

      // Emit the session ID so the client can store it
      this.emit('sessionId', this.sessionId);

      // Emit the session ID immediately
      this.emit('sessionId', this.sessionId);

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
      this.ptyProcess.removeAllListeners();
      this.ptyProcess.kill();
      this.ptyProcess = null;
    }
    
    this.status = 'stopped';
    this.containerClaudePid = null;
    this.claudePid = null;
    console.log(`[SSHAgent] Stopped session ${this.sessionId}`);
  }

  private async killContainerProcess(pid: string): Promise<void> {
    return new Promise((resolve) => {
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
      // Look for claude processes in the container (with or without --continue flag)
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