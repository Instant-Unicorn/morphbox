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
  private commandPending: boolean = false;
  private outputBuffer: string = '';
  private lastPromptTime: number = 0;

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

        // Add to output buffer for prompt detection
        this.outputBuffer += data;

        // Keep buffer size reasonable (last 1000 chars)
        if (this.outputBuffer.length > 1000) {
          this.outputBuffer = this.outputBuffer.slice(-1000);
        }

        // Detect both bash and Claude prompt patterns
        const cleanBuffer = this.outputBuffer.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, ''); // Remove ANSI codes

        // Bash prompt pattern (root@morphbox-vm or user@morphbox-vm)
        const bashPromptPattern = /(?:root|[a-z]+)@morphbox-vm:[^#$]*[#$]\s*$/;

        // Codex CLI prompt patterns (for regular terminals running Codex)
        const codexPromptPatterns = [
          /esc to interrupt/i,                         // Codex CLI waiting for input
          /esc to cancel/i,                            // Codex CLI waiting for input
          /press esc to/i,                             // Generic ESC prompt pattern
        ];

        // Gemini CLI prompt patterns (simple > prompt)
        const geminiPromptPatterns = [
          />\s*$/,                                     // Gemini's simple "> " prompt at end of buffer
        ];

        // Claude prompt patterns (detect when Claude is idle)
        // Claude's UI has the prompt on its own line, followed by other UI elements
        // So we look for the prompt pattern in the middle of the buffer, not just at the end
        const claudePromptPatterns = [
          /^>\s/m,                                     // Prompt at start of line (multiline mode)
          /\n>\s(?:Try|$)/m,                          // Prompt line with "Try" or just prompt
          /────+\n>\s/,                                // Separator line followed by prompt
        ];

        // Check if we're running Claude (vmUser is set for Claude)
        const isClaudeAgent = !!this.options.vmUser;

        // Select appropriate patterns based on agent type
        // For bash terminals, also check for Codex and Gemini CLI prompts
        const bashPromptDetected = bashPromptPattern.test(cleanBuffer);
        const codexPromptDetected = codexPromptPatterns.some(pattern => pattern.test(cleanBuffer));
        const geminiPromptDetected = geminiPromptPatterns.some(pattern => pattern.test(cleanBuffer));
        const claudePromptDetected = claudePromptPatterns.some(pattern => pattern.test(cleanBuffer));

        const promptDetected = isClaudeAgent ? claudePromptDetected : (bashPromptDetected || codexPromptDetected || geminiPromptDetected);

        // Codex/Gemini prompts are always considered "ready" even if commandPending is false
        // This is because they may start after the bash command completes
        const shouldEmitComplete = this.commandPending && promptDetected;
        const cliReady = !isClaudeAgent && (codexPromptDetected || geminiPromptDetected);

        if (shouldEmitComplete || cliReady) {
          // Command completed - prompt has returned
          const now = Date.now();
          // Debounce: only emit if more than 100ms since last prompt detection
          if (now - this.lastPromptTime > 100) {
            const agentType = isClaudeAgent ? 'Claude' : (codexPromptDetected ? 'Codex' : geminiPromptDetected ? 'Gemini' : 'Bash');
            console.log(`[BashAgent] ${agentType} command completed - prompt detected`);
            this.commandPending = false;
            this.lastPromptTime = now;
            this.outputBuffer = ''; // Clear buffer after prompt detection

            // Emit command complete event
            this.emit('command-complete');
          }
        }

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

      // NOTE: We used to run 'stty -echo' here to prevent double echo in terminals,
      // but this caused typed text to be invisible since xterm.js doesn't do local echo.
      // The shell should handle echoing, so we just clear the screen instead.
      setTimeout(() => {
        if (this.pty && this.status === 'running') {
          // Just clear the screen, don't disable echo
          this.pty.write('clear\n');
        }
      }, 100);

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

    // Detect if user pressed Enter (sending a command)
    if (input.includes('\r') || input.includes('\n')) {
      this.commandPending = true;
      console.log(`[BashAgent] Command submitted - waiting for completion`);
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