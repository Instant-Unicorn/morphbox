#!/usr/bin/env node

/**
 * Cross-platform lock manager for MorphBox
 * Uses directory creation as an atomic operation (works on all platforms)
 */

import fs from 'fs';
import path from 'path';

const LOCK_DIR = '/tmp/morphbox-startup-lock';
const LOCK_TIMEOUT = 5000; // 5 seconds
const STALE_LOCK_TIMEOUT = 30000; // 30 seconds - if lock is older than this, consider it stale

/**
 * Try to acquire a lock
 * @param {number} timeout - Maximum time to wait for lock in milliseconds
 * @returns {boolean} - true if lock acquired, false otherwise
 */
export function acquireLock(timeout = LOCK_TIMEOUT) {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    try {
      // Check if lock exists and if it's stale
      if (fs.existsSync(LOCK_DIR)) {
        const stats = fs.statSync(LOCK_DIR);
        const lockAge = Date.now() - stats.mtimeMs;

        if (lockAge > STALE_LOCK_TIMEOUT) {
          console.log('[Lock Manager] Removing stale lock (age:', Math.round(lockAge/1000), 'seconds)');
          try {
            fs.rmdirSync(LOCK_DIR);
          } catch (e) {
            // Ignore errors when removing stale lock
          }
        }
      }

      // Try to create lock directory (atomic operation)
      fs.mkdirSync(LOCK_DIR, { recursive: false });

      // Write PID to help identify lock owner
      const pidFile = path.join(LOCK_DIR, 'pid');
      fs.writeFileSync(pidFile, process.pid.toString());

      return true;
    } catch (e) {
      if (e.code !== 'EEXIST') {
        console.error('[Lock Manager] Unexpected error:', e.message);
        return false;
      }
      // Lock exists, wait a bit and try again
      const sleepTime = 100; // 100ms
      const endTime = Date.now() + sleepTime;
      while (Date.now() < endTime) {
        // Busy wait (synchronous sleep)
      }
    }
  }

  return false;
}

/**
 * Release the lock
 */
export function releaseLock() {
  try {
    // Check if we own the lock
    const pidFile = path.join(LOCK_DIR, 'pid');
    if (fs.existsSync(pidFile)) {
      const lockPid = parseInt(fs.readFileSync(pidFile, 'utf8'));
      if (lockPid === process.pid) {
        // We own the lock, remove it
        fs.unlinkSync(pidFile);
        fs.rmdirSync(LOCK_DIR);
        return true;
      }
    }
  } catch (e) {
    console.error('[Lock Manager] Error releasing lock:', e.message);
  }
  return false;
}

/**
 * Setup cleanup on exit
 */
export function setupCleanup() {
  const cleanup = () => {
    releaseLock();
  };

  process.on('exit', cleanup);
  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
  process.on('uncaughtException', (err) => {
    console.error('[Lock Manager] Uncaught exception:', err);
    cleanup();
    process.exit(1);
  });
}

// If run directly from command line
if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2];

  if (command === 'acquire') {
    const timeout = parseInt(process.argv[3]) || LOCK_TIMEOUT;
    if (acquireLock(timeout)) {
      console.log('Lock acquired');
      setupCleanup();
      // Keep process alive to hold lock
      process.stdin.resume();
    } else {
      console.error('Failed to acquire lock');
      process.exit(1);
    }
  } else if (command === 'release') {
    if (releaseLock()) {
      console.log('Lock released');
    } else {
      console.error('Failed to release lock');
      process.exit(1);
    }
  } else {
    console.log('Usage: lock-manager.js [acquire|release] [timeout_ms]');
    process.exit(1);
  }
}