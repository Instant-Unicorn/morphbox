/**
 * Audit Logger - Logs all commands and security events for audit trail
 * Uses JSON files for portability (no SQLite dependency)
 */

import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';
import { createReadStream } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface AuditEntry {
  id?: number;
  timestamp: string;
  type: 'command' | 'auth' | 'file_access' | 'error' | 'security';
  user?: string;
  ip?: string;
  sessionId?: string;
  action: string;
  details?: any;
  risk_level?: 'low' | 'medium' | 'high' | 'critical';
}

interface AuditStats {
  total_commands: number;
  total_auth_attempts: number;
  failed_auth_attempts: number;
  high_risk_commands: number;
  unique_ips: Set<string>;
  unique_sessions: Set<string>;
  last_updated: string;
}

class AuditLogger {
  private logDir: string;
  private currentLogPath: string;
  private statsPath: string;
  private entryCounter: number = 0;
  private stats: AuditStats;

  constructor() {
    // Setup log directory
    this.logDir = join(dirname(process.cwd()), 'morphbox-audit');
    if (!existsSync(this.logDir)) {
      mkdirSync(this.logDir, { recursive: true });
    }

    // Setup log files (JSON Lines format for easy appending)
    const date = new Date().toISOString().split('T')[0];
    this.currentLogPath = join(this.logDir, `audit-${date}.jsonl`);
    this.statsPath = join(this.logDir, `stats-${date}.json`);

    // Load or initialize stats
    this.loadStats();

    console.log('[AuditLogger] Initialized audit logging to:', this.logDir);
  }

  private loadStats(): void {
    if (existsSync(this.statsPath)) {
      try {
        const data = JSON.parse(readFileSync(this.statsPath, 'utf-8'));
        this.stats = {
          ...data,
          unique_ips: new Set(data.unique_ips || []),
          unique_sessions: new Set(data.unique_sessions || [])
        };
      } catch {
        this.initStats();
      }
    } else {
      this.initStats();
    }
  }

  private initStats(): void {
    this.stats = {
      total_commands: 0,
      total_auth_attempts: 0,
      failed_auth_attempts: 0,
      high_risk_commands: 0,
      unique_ips: new Set(),
      unique_sessions: new Set(),
      last_updated: new Date().toISOString()
    };
  }

  private saveStats(): void {
    const statsData = {
      ...this.stats,
      unique_ips: Array.from(this.stats.unique_ips),
      unique_sessions: Array.from(this.stats.unique_sessions),
      last_updated: new Date().toISOString()
    };
    writeFileSync(this.statsPath, JSON.stringify(statsData, null, 2));
  }

  /**
   * Log a command execution
   */
  logCommand(command: string, metadata: {
    ip?: string;
    sessionId?: string;
    user?: string;
    exitCode?: number;
    duration?: number;
  }): void {
    // Assess risk level based on command patterns
    const riskLevel = this.assessCommandRisk(command);
    
    const entry: AuditEntry = {
      id: ++this.entryCounter,
      timestamp: new Date().toISOString(),
      type: 'command',
      action: command,
      ip: metadata.ip,
      sessionId: metadata.sessionId,
      user: metadata.user,
      details: {
        exitCode: metadata.exitCode,
        duration: metadata.duration,
        truncated: command.length > 1000
      },
      risk_level: riskLevel
    };

    // Write to log file
    this.writeEntry(entry);
    
    // Update stats
    this.stats.total_commands++;
    if (riskLevel === 'high' || riskLevel === 'critical') {
      this.stats.high_risk_commands++;
    }
    if (metadata.ip) this.stats.unique_ips.add(metadata.ip);
    if (metadata.sessionId) this.stats.unique_sessions.add(metadata.sessionId);
    this.saveStats();

    // Alert on high-risk commands
    if (riskLevel === 'high' || riskLevel === 'critical') {
      this.alertHighRiskCommand(command, metadata);
    }
  }

  /**
   * Log authentication events
   */
  logAuth(action: string, success: boolean, metadata: {
    ip?: string;
    user?: string;
    method?: string;
  }): void {
    const entry: AuditEntry = {
      id: ++this.entryCounter,
      timestamp: new Date().toISOString(),
      type: 'auth',
      action: `${action} - ${success ? 'SUCCESS' : 'FAILED'}`,
      ip: metadata.ip,
      user: metadata.user,
      details: { method: metadata.method },
      risk_level: success ? 'low' : 'medium'
    };

    this.writeEntry(entry);
    
    // Update stats
    this.stats.total_auth_attempts++;
    if (!success) this.stats.failed_auth_attempts++;
    if (metadata.ip) this.stats.unique_ips.add(metadata.ip);
    this.saveStats();
  }

  /**
   * Log file access events
   */
  logFileAccess(action: 'read' | 'write' | 'delete', path: string, metadata: {
    ip?: string;
    sessionId?: string;
    user?: string;
    success?: boolean;
  }): void {
    const entry: AuditEntry = {
      id: ++this.entryCounter,
      timestamp: new Date().toISOString(),
      type: 'file_access',
      action: `${action.toUpperCase()} ${path}`,
      ip: metadata.ip,
      sessionId: metadata.sessionId,
      user: metadata.user,
      details: { success: metadata.success },
      risk_level: action === 'delete' ? 'medium' : 'low'
    };

    this.writeEntry(entry);
    if (metadata.ip) this.stats.unique_ips.add(metadata.ip);
    if (metadata.sessionId) this.stats.unique_sessions.add(metadata.sessionId);
    this.saveStats();
  }

  /**
   * Log security events
   */
  logSecurityEvent(event: string, metadata: any): void {
    const entry: AuditEntry = {
      id: ++this.entryCounter,
      timestamp: new Date().toISOString(),
      type: 'security',
      action: event,
      ip: metadata.ip,
      user: metadata.user,
      details: metadata,
      risk_level: metadata.risk_level || 'medium'
    };

    this.writeEntry(entry);
    if (metadata.ip) this.stats.unique_ips.add(metadata.ip);
    this.saveStats();
  }

  /**
   * Assess risk level of a command
   */
  private assessCommandRisk(command: string): 'low' | 'medium' | 'high' | 'critical' {
    const cmd = command.toLowerCase();

    // Critical risk patterns
    const criticalPatterns = [
      /rm\s+-rf\s+\//,           // rm -rf on root
      /:(){ :|:& };:/,           // Fork bomb
      /dd\s+if=.*of=\/dev\/[sh]d/, // Direct disk write
      /mkfs/,                    // Format filesystem
    ];

    // High risk patterns
    const highPatterns = [
      /rm\s+-rf/,                // Recursive delete
      /chmod\s+777/,             // Dangerous permissions
      /curl.*\|\s*(bash|sh)/,    // Remote code execution
      /wget.*\|\s*(bash|sh)/,    // Remote code execution
      /\/etc\/passwd/,           // Password file access
      /\/etc\/shadow/,           // Shadow file access
      /sudo/,                    // Privilege escalation
    ];

    // Medium risk patterns
    const mediumPatterns = [
      /kill/,                    // Process termination
      /pkill/,                   // Process termination
      /iptables/,                // Firewall changes
      /systemctl/,               // Service management
      /docker\s+rm/,             // Container deletion
      /git\s+push\s+--force/,   // Force push
    ];

    // Check patterns
    if (criticalPatterns.some(p => p.test(cmd))) return 'critical';
    if (highPatterns.some(p => p.test(cmd))) return 'high';
    if (mediumPatterns.some(p => p.test(cmd))) return 'medium';
    
    return 'low';
  }

  /**
   * Write entry to JSON Lines file
   */
  private writeEntry(entry: AuditEntry): void {
    try {
      const line = JSON.stringify(entry) + '\n';
      appendFileSync(this.currentLogPath, line);
    } catch (error) {
      console.error('[AuditLogger] Write error:', error);
    }
  }

  /**
   * Alert on high-risk commands
   */
  private alertHighRiskCommand(command: string, metadata: any): void {
    console.warn('⚠️  HIGH RISK COMMAND DETECTED:', {
      command: command.substring(0, 100),
      ip: metadata.ip,
      sessionId: metadata.sessionId
    });

    // Send webhook alert if configured
    const webhookUrl = process.env.MORPHBOX_SECURITY_WEBHOOK_URL;
    if (webhookUrl) {
      fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alert: 'HIGH_RISK_COMMAND',
          command,
          metadata,
          timestamp: new Date().toISOString()
        })
      }).catch(err => console.error('[AuditLogger] Webhook error:', err));
    }
  }

  /**
   * Query command history from JSON Lines file
   */
  async getCommandHistory(options: {
    limit?: number;
    sessionId?: string;
    ip?: string;
    startDate?: Date;
    endDate?: Date;
    riskLevel?: string;
  } = {}): Promise<AuditEntry[]> {
    const entries: AuditEntry[] = [];
    
    if (!existsSync(this.currentLogPath)) {
      return entries;
    }

    return new Promise((resolve, reject) => {
      const stream = createReadStream(this.currentLogPath);
      const rl = readline.createInterface({
        input: stream,
        crlfDelay: Infinity
      });

      rl.on('line', (line) => {
        try {
          const entry = JSON.parse(line) as AuditEntry;
          
          // Apply filters
          if (entry.type !== 'command') return;
          if (options.sessionId && entry.sessionId !== options.sessionId) return;
          if (options.ip && entry.ip !== options.ip) return;
          if (options.riskLevel && entry.risk_level !== options.riskLevel) return;
          
          if (options.startDate && new Date(entry.timestamp) < options.startDate) return;
          if (options.endDate && new Date(entry.timestamp) > options.endDate) return;
          
          entries.push(entry);
        } catch {}
      });

      rl.on('close', () => {
        // Sort by timestamp descending and apply limit
        entries.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
        if (options.limit) {
          resolve(entries.slice(0, options.limit));
        } else {
          resolve(entries);
        }
      });

      rl.on('error', reject);
    });
  }

  /**
   * Get audit statistics
   */
  getStatistics(): any {
    return {
      total_commands: { count: this.stats.total_commands },
      total_auth_attempts: { count: this.stats.total_auth_attempts },
      failed_auth_attempts: { count: this.stats.failed_auth_attempts },
      high_risk_commands: { count: this.stats.high_risk_commands },
      unique_ips: { count: this.stats.unique_ips.size },
      unique_sessions: { count: this.stats.unique_sessions.size },
      last_updated: this.stats.last_updated
    };
  }

  /**
   * Clean up old logs (rotate logs)
   */
  cleanup(daysToKeep: number = 30): void {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    
    // In production, would scan directory and remove old .jsonl files
    console.log(`[AuditLogger] Log rotation not yet implemented`);
  }
}

// Export singleton instance
export const auditLogger = new AuditLogger();