import { execSync } from 'child_process';
import type { IPty } from 'node-pty';
import pty from 'node-pty';

interface ContainerSession {
  sessionId: string;
  pid: string;
  createdAt: Date;
  lastAccessed: Date;
}

class ContainerSessionManager {
  private sessions = new Map<string, ContainerSession>();
  private ptyProcesses = new Map<string, IPty>();
  
  private getSessionPid(sessionId: string): string | null {
    try {
      // Check if session file exists in container
      const result = execSync(
        `docker exec morphbox-vm cat /tmp/.morphbox-session-${sessionId} 2>/dev/null`,
        { encoding: 'utf-8' }
      ).trim();
      
      if (result) {
        // Verify the PID is still running
        const pidCheck = execSync(
          `docker exec morphbox-vm ps -p ${result} -o pid= 2>/dev/null`,
          { encoding: 'utf-8' }
        ).trim();
        
        return pidCheck ? result : null;
      }
    } catch {
      // Session doesn't exist
    }
    return null;
  }

  private createPersistentSession(
    sessionId: string,
    command: string,
    args: string[]
  ): string {
    // Create a wrapper script that will persist the session
    const wrapperScript = `#!/bin/bash
# Session: ${sessionId}
SESSION_FILE="/tmp/.morphbox-session-${sessionId}"
LOG_FILE="/tmp/.morphbox-session-${sessionId}.log"
FIFO_FILE="/tmp/.morphbox-session-${sessionId}.fifo"

# Create named pipe for input
mkfifo "$FIFO_FILE" 2>/dev/null || true

# Save PID
echo $$ > "$SESSION_FILE"

# Cleanup function
cleanup() {
  rm -f "$SESSION_FILE" "$LOG_FILE" "$FIFO_FILE"
  exit
}
trap cleanup EXIT

# Start the actual command with input from FIFO
exec 3< "$FIFO_FILE"
${command} ${args.join(' ')} <&3 2>&1 | tee "$LOG_FILE"
`;

    // Write wrapper script to container
    execSync(
      `docker exec morphbox-vm bash -c 'cat > /tmp/morphbox-wrapper-${sessionId}.sh << "EOF"
${wrapperScript}
EOF
chmod +x /tmp/morphbox-wrapper-${sessionId}.sh'`
    );

    // Start the session in background
    execSync(
      `docker exec -d morphbox-vm /tmp/morphbox-wrapper-${sessionId}.sh`
    );

    // Wait a moment for the session to start
    const maxAttempts = 10;
    for (let i = 0; i < maxAttempts; i++) {
      const pid = this.getSessionPid(sessionId);
      if (pid) {
        return pid;
      }
      execSync('sleep 0.1');
    }

    throw new Error(`Failed to start session ${sessionId}`);
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
    const existingPid = this.getSessionPid(sessionId);

    if (existingPid) {
      console.log(`Attaching to existing session ${sessionId} (PID: ${existingPid})`);
      
      // Attach to existing session via tail and FIFO
      const attachArgs = [
        'exec',
        '-it',
        'morphbox-vm',
        'bash', '-c',
        `# Attach to session ${sessionId}
         FIFO_FILE="/tmp/.morphbox-session-${sessionId}.fifo"
         LOG_FILE="/tmp/.morphbox-session-${sessionId}.log"
         
         # Show recent output
         tail -n 50 "$LOG_FILE" 2>/dev/null || echo "No session history"
         
         # Connect to FIFO for input/output
         exec 3> "$FIFO_FILE"
         tail -f "$LOG_FILE" &
         TAIL_PID=$!
         
         # Forward input to FIFO
         while IFS= read -r line; do
           echo "$line" >&3
         done
         
         kill $TAIL_PID 2>/dev/null`
      ];
      
      ptyProcess = pty.spawn('docker', attachArgs, config.options);
    } else {
      console.log(`Creating new session: ${sessionId}`);
      
      // Extract the actual command from docker exec args
      const commandIndex = config.args.indexOf('-c');
      let actualCommand = 'claude --dangerously-skip-permissions';
      
      if (commandIndex !== -1 && commandIndex + 1 < config.args.length) {
        actualCommand = config.args[commandIndex + 1];
      }
      
      // Create persistent session
      const pid = this.createPersistentSession(sessionId, 'bash', ['-c', actualCommand]);
      
      // Now attach to it
      return this.attachOrCreateSession(sessionId, config);
    }

    // Store PTY process
    this.ptyProcesses.set(sessionId, ptyProcess);

    // Create/update session record
    this.sessions.set(sessionId, {
      sessionId,
      pid: existingPid || '',
      createdAt: new Date(),
      lastAccessed: new Date()
    });

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
      
      // Just remove PTY reference but keep session running
      this.ptyProcesses.delete(sessionId);
      
      const session = this.sessions.get(sessionId);
      if (session) {
        session.lastAccessed = new Date();
      }
    }
  }

  killSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session && session.pid) {
      try {
        // Kill the process in the container
        execSync(`docker exec morphbox-vm kill ${session.pid}`, { stdio: 'ignore' });
        console.log(`Killed session: ${sessionId}`);
      } catch (error) {
        console.error(`Failed to kill session: ${sessionId}`, error);
      }
    }

    // Clean up files
    try {
      execSync(
        `docker exec morphbox-vm rm -f /tmp/.morphbox-session-${sessionId}* /tmp/morphbox-wrapper-${sessionId}.sh`,
        { stdio: 'ignore' }
      );
    } catch {
      // Ignore cleanup errors
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

  getActiveSessions(): ContainerSession[] {
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
export const containerSessionManager = new ContainerSessionManager();