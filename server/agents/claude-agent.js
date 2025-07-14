import { spawn } from 'child_process';
import { EventEmitter } from 'events';
import chalk from 'chalk';

export class ClaudeAgent extends EventEmitter {
  constructor(id, options) {
    super();
    this.id = id;
    this.type = 'claude';
    this.options = options;
    this.process = null;
    this.status = 'initialized';
    this.startTime = Date.now();
    this.outputBuffer = '';
    this.commandQueue = [];
    this.isProcessing = false;
  }

  async initialize() {
    const { workspacePath, sessionId } = this.options;

    // Spawn Claude CLI process
    const args = ['--session', sessionId];
    
    // Add workspace path if provided
    if (workspacePath) {
      args.push('--workspace', workspacePath);
    }

    try {
      this.process = spawn('claude', args, {
        cwd: workspacePath || process.cwd(),
        env: {
          ...process.env,
          CLAUDE_SESSION_ID: sessionId,
          CLAUDE_WORKSPACE: workspacePath
        }
      });

      this.status = 'running';

      // Handle stdout
      this.process.stdout.on('data', (data) => {
        const output = data.toString();
        this.outputBuffer += output;
        
        // Emit output for real-time streaming
        this.emit('output', output);
        
        // Call the output callback if provided
        if (this.options.onOutput) {
          this.options.onOutput(output);
        }
      });

      // Handle stderr
      this.process.stderr.on('data', (data) => {
        const error = data.toString();
        console.error(chalk.red(`Claude agent error: ${error}`));
        
        this.emit('error', error);
        
        if (this.options.onError) {
          this.options.onError(error);
        }
      });

      // Handle process exit
      this.process.on('exit', (code) => {
        this.status = 'exited';
        this.emit('exit', code);
      });

      // Wait a bit for process to fully start
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Check if process is still running
      if (this.process.killed || this.status === 'exited') {
        throw new Error('Claude process failed to start');
      }

    } catch (error) {
      this.status = 'error';
      
      // If Claude CLI is not installed, provide helpful message
      if (error.code === 'ENOENT') {
        throw new Error(
          'Claude CLI not found. Please ensure Claude is installed in the VM.\n' +
          'You can install it with: npm install -g @anthropic/claude-cli'
        );
      }
      
      throw error;
    }
  }

  async sendInput(input) {
    return new Promise((resolve, reject) => {
      if (!this.process || this.status !== 'running') {
        reject(new Error('Agent is not running'));
        return;
      }

      // Add command to queue
      this.commandQueue.push({ input, resolve, reject });
      
      // Process queue if not already processing
      if (!this.isProcessing) {
        this.processCommandQueue();
      }
    });
  }

  async processCommandQueue() {
    if (this.commandQueue.length === 0) {
      this.isProcessing = false;
      return;
    }

    this.isProcessing = true;
    const { input, resolve, reject } = this.commandQueue.shift();

    try {
      // Clear output buffer
      this.outputBuffer = '';

      // Send input to Claude
      this.process.stdin.write(input + '\n');

      // Wait for output (with timeout)
      const output = await this.waitForOutput(5000);

      resolve({
        output,
        error: null
      });

    } catch (error) {
      reject(error);
    }

    // Process next command in queue
    this.processCommandQueue();
  }

  async waitForOutput(timeout = 5000) {
    const startTime = Date.now();
    let lastOutputTime = Date.now();
    const checkInterval = 100;

    return new Promise((resolve, reject) => {
      const checkOutput = setInterval(() => {
        const currentTime = Date.now();

        // Check if we have output and it's been stable for a bit
        if (this.outputBuffer.length > 0 && 
            currentTime - lastOutputTime > 500) {
          clearInterval(checkOutput);
          const output = this.outputBuffer;
          this.outputBuffer = '';
          resolve(output);
          return;
        }

        // Update last output time if buffer changed
        if (this.outputBuffer.length > 0) {
          lastOutputTime = currentTime;
        }

        // Check for timeout
        if (currentTime - startTime > timeout) {
          clearInterval(checkOutput);
          reject(new Error('Command timeout'));
        }
      }, checkInterval);
    });
  }

  async stop() {
    if (this.process && !this.process.killed) {
      // Send exit command to Claude
      try {
        this.process.stdin.write('exit\n');
        
        // Give it a moment to exit gracefully
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        // Ignore errors when writing to closed stdin
      }

      // Force kill if still running
      if (!this.process.killed) {
        this.process.kill('SIGTERM');
      }
    }

    this.status = 'stopped';
  }
}