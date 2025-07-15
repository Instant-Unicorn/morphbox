import { execSync } from 'child_process';
import type { IPty } from 'node-pty';
import pty from 'node-pty';

interface ScreenSession {
  sessionId: string;
  screenName: string;
  createdAt: Date;
  lastAccessed: Date;
}

class ScreenManager {
  private sessions = new Map<string, ScreenSession>();
  private ptyProcesses = new Map<string, IPty>();
  
  constructor() {
    // Clean up any orphaned screen sessions on startup
    this.cleanupOrphanedSessions();
  }

  private cleanupOrphanedSessions() {
    try {
      // List all screen sessions
      const output = execSync('screen -ls', { encoding: 'utf-8' }).toString();
      const lines = output.split('\n');
      
      // Parse and detach dead sessions
      lines.forEach(line => {
        if (line.includes('(Dead ???)')) {
          const match = line.match(/\d+\.morphbox-[a-zA-Z0-9-]+/);
          if (match) {
            console.log(`Cleaning up dead screen session: ${match[0]}`);
            execSync(`screen -wipe ${match[0]}`, { stdio: 'ignore' });
          }
        }
      });
    } catch (error) {
      // Ignore errors from screen -ls when no sessions exist
    }
  }

  private generateScreenName(sessionId: string): string {
    return `morphbox-${sessionId}`;
  }

  private isScreenSessionActive(screenName: string): boolean {
    try {
      const output = execSync('screen -ls', { encoding: 'utf-8' }).toString();
      return output.includes(screenName) && !output.includes('(Dead ???)');
    } catch {
      return false;
    }
  }

  attachOrCreateSession(
    sessionId: string,
    config: {
      command: string;
      args: string[];
      options: any;
    }
  ): IPty {
    // Check if we already have a PTY for this session
    const existingPty = this.ptyProcesses.get(sessionId);
    if (existingPty) {
      console.log(`Reusing existing PTY for session ${sessionId}`);
      const session = this.sessions.get(sessionId);
      if (session) {
        session.lastAccessed = new Date();
      }
      return existingPty;
    }

    const screenName = this.generateScreenName(sessionId);
    const sessionActive = this.isScreenSessionActive(screenName);

    console.log(`Session ${sessionId} active: ${sessionActive}`);

    let ptyProcess: IPty;

    if (sessionActive) {
      // Attach to existing screen session
      console.log(`Attaching to existing screen session: ${screenName}`);
      
      // Use -r -x to resume the session
      ptyProcess = pty.spawn('screen', ['-r', '-x', screenName], {
        name: 'xterm-256color',
        cols: config.options.cols || 80,
        rows: config.options.rows || 24,
        cwd: config.options.cwd || process.cwd(),
        env: {
          ...process.env,
          TERM: 'xterm-256color',
          ...config.options.env
        }
      });
    } else {
      // Create new screen session with the command
      console.log(`Creating new screen session: ${screenName}`);
      
      // Create a wrapper script to ensure proper environment
      const wrapperCommand = `${config.command} ${config.args.join(' ')}`;
      
      // Start screen with command directly
      // -q: quiet startup
      // -S: session name
      // -t: window title
      // The command arguments are passed directly to screen
      const screenArgs = ['-q', '-S', screenName, '-t', 'morphbox', config.command, ...config.args];
      
      ptyProcess = pty.spawn('screen', screenArgs, {
        name: 'xterm-256color',
        cols: config.options.cols || 80,
        rows: config.options.rows || 24,
        cwd: config.options.cwd || process.cwd(),
        env: {
          ...process.env,
          TERM: 'xterm-256color',
          ...config.options.env
        }
      });

      // Create session record
      this.sessions.set(sessionId, {
        sessionId,
        screenName,
        createdAt: new Date(),
        lastAccessed: new Date()
      });
    }

    // Store PTY process
    this.ptyProcesses.set(sessionId, ptyProcess);

    // Handle PTY exit
    ptyProcess.onExit(() => {
      console.log(`PTY process exited for session ${sessionId}`);
      this.ptyProcesses.delete(sessionId);
    });

    return ptyProcess;
  }

  detachSession(sessionId: string): void {
    const ptyProcess = this.ptyProcesses.get(sessionId);
    if (ptyProcess) {
      console.log(`Detaching from session ${sessionId}`);
      
      // Send Ctrl+A, D to detach from screen
      ptyProcess.write('\x01d');
      
      // Remove PTY reference but keep session info
      this.ptyProcesses.delete(sessionId);
      
      const session = this.sessions.get(sessionId);
      if (session) {
        session.lastAccessed = new Date();
      }
    }
  }

  killSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      try {
        // Kill the screen session
        execSync(`screen -S ${session.screenName} -X quit`, { stdio: 'ignore' });
        console.log(`Killed screen session: ${session.screenName}`);
      } catch (error) {
        console.error(`Failed to kill screen session: ${session.screenName}`, error);
      }
    }

    // Clean up PTY if exists
    const ptyProcess = this.ptyProcesses.get(sessionId);
    if (ptyProcess) {
      try {
        ptyProcess.kill();
      } catch (error) {
        console.error(`Failed to kill PTY process for session ${sessionId}`, error);
      }
    }

    this.sessions.delete(sessionId);
    this.ptyProcesses.delete(sessionId);
  }

  getActiveSessions(): ScreenSession[] {
    return Array.from(this.sessions.values());
  }

  // Clean up old sessions periodically
  startCleanupTimer(maxAge: number = 24 * 60 * 60 * 1000): void {
    setInterval(() => {
      const now = Date.now();
      this.sessions.forEach((session, sessionId) => {
        if (now - session.lastAccessed.getTime() > maxAge) {
          console.log(`Cleaning up old session: ${sessionId}`);
          this.killSession(sessionId);
        }
      });
    }, 60 * 60 * 1000); // Check every hour
  }
}

// Export singleton instance
export const screenManager = new ScreenManager();