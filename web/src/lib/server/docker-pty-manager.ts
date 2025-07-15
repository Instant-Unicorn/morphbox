import { execSync } from 'child_process';
import type { IPty } from 'node-pty';
import pty from 'node-pty';

interface DockerSession {
  sessionId: string;
  containerExecId: string;
  createdAt: Date;
  lastAccessed: Date;
}

class DockerPtyManager {
  private sessions = new Map<string, DockerSession>();
  private ptyProcesses = new Map<string, IPty>();
  
  constructor() {
    // Clean up any orphaned exec sessions on startup
    this.cleanupOrphanedSessions();
  }

  private cleanupOrphanedSessions() {
    try {
      // List all exec instances for morphbox-vm container
      const output = execSync('docker exec morphbox-vm ps aux | grep "claude --dangerously"', { encoding: 'utf-8' }).toString();
      console.log('Found running claude processes:', output);
    } catch (error) {
      // Ignore errors when no processes found
    }
  }

  private getExecId(sessionId: string): string | null {
    try {
      // Check if there's an existing exec session
      const output = execSync(`docker exec morphbox-vm ps aux | grep "${sessionId}" | grep -v grep`, { encoding: 'utf-8' }).toString();
      if (output) {
        // Extract PID from the process
        const match = output.match(/^\w+\s+(\d+)/);
        return match ? match[1] : null;
      }
    } catch {
      // No existing session
    }
    return null;
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

    let ptyProcess: IPty;

    // For docker exec, we'll create a marker file to track sessions
    const markerFile = `/tmp/.morphbox-session-${sessionId}`;
    const existingExecId = this.getExecId(sessionId);

    if (existingExecId) {
      console.log(`Found existing process for session ${sessionId}, PID: ${existingExecId}`);
      
      // Attach to existing process using docker exec
      const attachArgs = [
        'exec',
        '-it',
        'morphbox-vm',
        'bash', '-c',
        `# Reattaching to session ${sessionId}
         if [ -f "${markerFile}" ]; then
           tail -f "${markerFile}.log" 2>/dev/null || echo "Session lost"
         else
           echo "Session ${sessionId} not found"
         fi`
      ];
      
      ptyProcess = pty.spawn('docker', attachArgs, config.options);
    } else {
      console.log(`Creating new session: ${sessionId}`);
      
      // Modify args to include session tracking
      const modifiedArgs = [...config.args];
      const commandIndex = modifiedArgs.indexOf('-c');
      if (commandIndex !== -1 && commandIndex + 1 < modifiedArgs.length) {
        // Wrap the command to create session marker and log output
        modifiedArgs[commandIndex + 1] = `
          touch "${markerFile}"
          echo "Session ${sessionId} started at $(date)" > "${markerFile}.log"
          (${modifiedArgs[commandIndex + 1]}) 2>&1 | tee -a "${markerFile}.log"
          rm -f "${markerFile}" "${markerFile}.log"
        `;
      }
      
      ptyProcess = pty.spawn(config.command, modifiedArgs, config.options);

      // Create session record
      this.sessions.set(sessionId, {
        sessionId,
        containerExecId: '',
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
      
      // Clean up marker files
      try {
        execSync(`docker exec morphbox-vm rm -f "${markerFile}" "${markerFile}.log"`, { stdio: 'ignore' });
      } catch {
        // Ignore cleanup errors
      }
    });

    return ptyProcess;
  }

  detachSession(sessionId: string): void {
    const ptyProcess = this.ptyProcesses.get(sessionId);
    if (ptyProcess) {
      console.log(`Detaching from session ${sessionId}`);
      
      // Just remove PTY reference but keep session info
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
        // Kill the process in the container
        const markerFile = `/tmp/.morphbox-session-${sessionId}`;
        execSync(`docker exec morphbox-vm rm -f "${markerFile}" "${markerFile}.log"`, { stdio: 'ignore' });
        console.log(`Killed session: ${sessionId}`);
      } catch (error) {
        console.error(`Failed to kill session: ${sessionId}`, error);
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

  getActiveSessions(): DockerSession[] {
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
export const dockerPtyManager = new DockerPtyManager();