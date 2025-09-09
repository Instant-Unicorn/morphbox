// SECURITY: Rate limiting implementation to prevent brute force attacks

interface RateLimitEntry {
  attempts: number;
  firstAttempt: number;
  lastAttempt: number;
  blocked: boolean;
  blockExpiry?: number;
}

export class RateLimiter {
  private attempts: Map<string, RateLimitEntry> = new Map();
  private readonly maxAttempts: number;
  private readonly windowMs: number;
  private readonly blockDurationMs: number;
  private readonly cleanupIntervalMs: number = 60000; // Clean up old entries every minute
  private cleanupTimer: NodeJS.Timeout;

  constructor(options: {
    maxAttempts?: number;
    windowMs?: number;
    blockDurationMs?: number;
  } = {}) {
    this.maxAttempts = options.maxAttempts || 5;
    this.windowMs = options.windowMs || 15 * 60 * 1000; // 15 minutes default
    this.blockDurationMs = options.blockDurationMs || 30 * 60 * 1000; // 30 minutes default
    
    // Start cleanup timer
    this.cleanupTimer = setInterval(() => this.cleanup(), this.cleanupIntervalMs);
  }

  /**
   * Check if an identifier (IP, username, etc.) should be rate limited
   * @returns true if the request should be blocked, false if allowed
   */
  isBlocked(identifier: string): boolean {
    const entry = this.attempts.get(identifier);
    
    if (!entry) {
      return false;
    }

    // Check if currently blocked
    if (entry.blocked && entry.blockExpiry) {
      if (Date.now() < entry.blockExpiry) {
        return true;
      } else {
        // Block expired, reset
        entry.blocked = false;
        entry.blockExpiry = undefined;
        entry.attempts = 0;
      }
    }

    // Check if attempts are within time window
    if (Date.now() - entry.firstAttempt > this.windowMs) {
      // Window expired, reset attempts
      entry.attempts = 0;
      entry.firstAttempt = Date.now();
      return false;
    }

    return entry.attempts >= this.maxAttempts;
  }

  /**
   * Record a failed attempt
   */
  recordFailedAttempt(identifier: string): void {
    let entry = this.attempts.get(identifier);
    
    if (!entry) {
      entry = {
        attempts: 1,
        firstAttempt: Date.now(),
        lastAttempt: Date.now(),
        blocked: false
      };
      this.attempts.set(identifier, entry);
    } else {
      entry.attempts++;
      entry.lastAttempt = Date.now();
      
      // Check if we should block
      if (entry.attempts >= this.maxAttempts) {
        entry.blocked = true;
        entry.blockExpiry = Date.now() + this.blockDurationMs;
        console.warn(`[RateLimiter] Blocking ${identifier} for ${this.blockDurationMs}ms after ${entry.attempts} failed attempts`);
      }
    }
  }

  /**
   * Record a successful attempt (resets the counter)
   */
  recordSuccessfulAttempt(identifier: string): void {
    this.attempts.delete(identifier);
  }

  /**
   * Get remaining attempts for an identifier
   */
  getRemainingAttempts(identifier: string): number {
    const entry = this.attempts.get(identifier);
    if (!entry) {
      return this.maxAttempts;
    }
    
    // Check if window expired
    if (Date.now() - entry.firstAttempt > this.windowMs) {
      return this.maxAttempts;
    }
    
    return Math.max(0, this.maxAttempts - entry.attempts);
  }

  /**
   * Clean up old entries to prevent memory leaks
   */
  private cleanup(): void {
    const now = Date.now();
    const entriesToDelete: string[] = [];
    
    for (const [identifier, entry] of this.attempts.entries()) {
      // Remove entries that haven't been used in over an hour
      if (now - entry.lastAttempt > 3600000) {
        entriesToDelete.push(identifier);
      }
    }
    
    for (const identifier of entriesToDelete) {
      this.attempts.delete(identifier);
    }
    
    if (entriesToDelete.length > 0) {
      console.log(`[RateLimiter] Cleaned up ${entriesToDelete.length} old entries`);
    }
  }

  /**
   * Destroy the rate limiter and clean up resources
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    this.attempts.clear();
  }
}

// Export singleton instance for authentication
export const authRateLimiter = new RateLimiter({
  maxAttempts: 5,
  windowMs: 15 * 60 * 1000, // 15 minutes
  blockDurationMs: 30 * 60 * 1000 // 30 minutes
});