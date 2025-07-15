import { execSync } from 'child_process';
import pty from 'node-pty';

interface TmuxSession {
  sessionId: string;
  sessionName: string;
  createdAt: Date;
  lastAccessed: Date;
}

class TmuxContainerManager {
  private sessions = new Map<string, TmuxSession>();
  
  private generateTmuxSessionName(sessionId: string): string {
    // Tmux session names must start with letter/number and contain only letters, numbers, underscore
    return `morphbox_${sessionId.replace(/[^a-zA-Z0-9]/g, '_')}`;
  }

  private isTmuxSessionActive(sessionName: string): boolean {
    try {
      const output = execSync(
        `docker exec morphbox-vm tmux list-sessions 2>/dev/null | grep "^${sessionName}:"`,
        { encoding: 'utf-8' }
      ).toString();
      return output.includes(sessionName);
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
  ): InstanceType<typeof pty.spawn> {
    const sessionName = this.generateTmuxSessionName(sessionId);
    const sessionExists = this.isTmuxSessionActive(sessionName);

    console.log(`Tmux session ${sessionName} exists: ${sessionExists}`);

    let dockerArgs: string[];

    if (sessionExists) {
      console.log(`Attaching to existing tmux session: ${sessionName}`);
      
      // Attach to existing tmux session
      dockerArgs = [
        'exec',
        '-it',
        'morphbox-vm',
        'su', '-', 'morphbox', '-c',
        `tmux attach-session -t ${sessionName}`
      ];
    } else {
      console.log(`Creating new tmux session: ${sessionName}`);
      
      // Extract the actual command from docker exec args
      const commandIndex = config.args.indexOf('-c');
      let actualCommand = 'claude --dangerously-skip-permissions';
      
      if (commandIndex !== -1 && commandIndex + 1 < config.args.length) {
        actualCommand = config.args[commandIndex + 1];
      }
      
      // Create new tmux session with the command
      dockerArgs = [
        'exec',
        '-it', 
        'morphbox-vm',
        'su', '-', 'morphbox', '-c',
        `tmux new-session -d -s ${sessionName} '${actualCommand}' && tmux attach-session -t ${sessionName}`
      ];
    }

    // Create PTY with docker
    const ptyProcess = pty.spawn('docker', dockerArgs, {
      name: 'xterm-256color',
      cols: config.options.cols || 80,
      rows: config.options.rows || 30,
      cwd: config.options.cwd || process.cwd(),
      env: {
        ...process.env,
        TERM: 'xterm-256color',
        ...config.options.env
      }
    });

    // Update session tracking
    if (!this.sessions.has(sessionId)) {
      this.sessions.set(sessionId, {
        sessionId,
        sessionName,
        createdAt: new Date(),
        lastAccessed: new Date()
      });
    } else {
      const session = this.sessions.get(sessionId)!;
      session.lastAccessed = new Date();
    }

    return ptyProcess;
  }

  detachSession(sessionId: string): void {
    // Tmux will automatically detach when the PTY is closed
    console.log(`Detaching from tmux session for ${sessionId}`);
    
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastAccessed = new Date();
    }
  }

  killSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      try {
        // Kill the tmux session in the container
        execSync(
          `docker exec morphbox-vm tmux kill-session -t ${session.sessionName}`,
          { stdio: 'ignore' }
        );
        console.log(`Killed tmux session: ${session.sessionName}`);
      } catch (error) {
        console.error(`Failed to kill tmux session: ${session.sessionName}`, error);
      }
    }

    this.sessions.delete(sessionId);
  }

  getActiveSessions(): TmuxSession[] {
    return Array.from(this.sessions.values());
  }

  // Clean up old sessions periodically
  startCleanupTimer(maxAge: number = 24 * 60 * 60 * 1000): void {
    setInterval(() => {
      const now = Date.now();
      this.sessions.forEach((session, sessionId) => {
        if (now - session.lastAccessed.getTime() > maxAge) {
          console.log(`Cleaning up old tmux session: ${sessionId}`);
          this.killSession(sessionId);
        }
      });
    }, 60 * 60 * 1000); // Check every hour
  }
}

// Export singleton instance
export const tmuxContainerManager = new TmuxContainerManager();