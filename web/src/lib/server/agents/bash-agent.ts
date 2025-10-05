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
        const promptDetected = isClaudeAgent
          ? claudePromptPatterns.some(pattern => pattern.test(cleanBuffer))
          : bashPromptPattern.test(cleanBuffer);

        if (this.commandPending && promptDetected) {
          // Command completed - prompt has returned
          const now = Date.now();
          // Debounce: only emit if more than 100ms since last prompt detection
          if (now - this.lastPromptTime > 100) {
            const agentType = isClaudeAgent ? 'Claude' : 'Bash';
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

      // Check for Codex CLI authentication if this is a Claude agent
      if (this.options.vmUser) {
        setTimeout(() => {
          this.checkCodexAuth();
        }, 500);
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

    // Detect if user pressed Enter (sending a command)
    if (input.includes('\r') || input.includes('\n')) {
      this.commandPending = true;
      console.log(`[BashAgent] Command submitted - waiting for completion`);
    }

    this.pty.write(input);
  }

  /**
   * Check if Codex CLI is authenticated
   * Emits 'codex-auth-status' event with authentication status
   */
  private checkCodexAuth(): void {
    if (!this.pty) return;

    console.log('[BashAgent] Checking Codex CLI authentication status...');

    // Create a temporary handler to capture the auth check result
    let authCheckOutput = '';
    const tempHandler = (data: string) => {
      authCheckOutput += data;
    };

    // Add temporary data handler
    this.pty.onData(tempHandler);

    // Check if auth.json exists
    this.pty.write('test -f ~/.codex/auth.json && echo "CODEX_AUTH_EXISTS" || echo "CODEX_AUTH_MISSING"\n');

    // Wait for result
    setTimeout(() => {
      // Remove temporary handler
      // Note: node-pty doesn't have removeListener, so we just let it go

      const isAuthenticated = authCheckOutput.includes('CODEX_AUTH_EXISTS');

      console.log(`[BashAgent] Codex auth status: ${isAuthenticated ? 'authenticated' : 'not authenticated'}`);

      // Emit auth status event
      this.emit('codex-auth-status', {
        authenticated: isAuthenticated,
        agentId: this.id
      });

      // If not authenticated, display helpful message in terminal
      if (!isAuthenticated) {
        const helpMessage = `
\x1b[33m╔════════════════════════════════════════════════════════════════╗
║  OpenAI Codex CLI Not Authenticated                           ║
╚════════════════════════════════════════════════════════════════╝\x1b[0m

To use Codex CLI in this terminal, you need to authenticate first.

\x1b[36mOption 1: API Key (Simplest)\x1b[0m
  codex login --with-api-key

\x1b[36mOption 2: Transfer auth.json (Recommended)\x1b[0m
  1. On your local machine: codex login
  2. Copy ~/.codex/auth.json to MorphBox
  3. Run: ./scripts/codex-setup-auth.sh

\x1b[36mFor detailed instructions:\x1b[0m
  See docs/CODEX_AUTHENTICATION.md

`;
        if (this.pty) {
          this.pty.write(helpMessage);
        }
      }
    }, 500);
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