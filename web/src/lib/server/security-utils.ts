// Security utilities for MorphBox

import crypto from 'crypto';
import type { RequestEvent } from '@sveltejs/kit';

/**
 * Security headers to prevent common attacks
 */
export const SECURITY_HEADERS = {
  // Prevent clickjacking
  'X-Frame-Options': 'DENY',
  // Prevent MIME type sniffing
  'X-Content-Type-Options': 'nosniff',
  // Enable XSS protection
  'X-XSS-Protection': '1; mode=block',
  // Referrer policy
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  // Permissions policy
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
  // Content Security Policy (adjust as needed)
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' ws: wss:;"
};

/**
 * Apply security headers to a response
 */
export function applySecurityHeaders(response: Response): Response {
  if (process.env.MORPHBOX_SECURITY_HEADERS === 'false') {
    return response;
  }

  const newHeaders = new Headers(response.headers);
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    newHeaders.set(key, value);
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders
  });
}

/**
 * Sanitize user input to prevent injection attacks
 */
export function sanitizeInput(input: string, options: {
  maxLength?: number;
  allowedChars?: RegExp;
  stripHtml?: boolean;
} = {}): string {
  const {
    maxLength = 10000,
    allowedChars,
    stripHtml = true
  } = options;

  // Limit length
  let sanitized = input.substring(0, maxLength);

  // Strip HTML tags if requested
  if (stripHtml) {
    sanitized = sanitized.replace(/<[^>]*>/g, '');
  }

  // Filter allowed characters if specified
  if (allowedChars) {
    sanitized = sanitized.split('').filter(char => allowedChars.test(char)).join('');
  }

  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '');

  return sanitized;
}

/**
 * Generate a cryptographically secure random token
 */
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Hash a password using PBKDF2
 */
export async function hashPassword(password: string, salt?: string): Promise<{ hash: string; salt: string }> {
  const useSalt = salt || crypto.randomBytes(16).toString('hex');
  
  return new Promise((resolve, reject) => {
    crypto.pbkdf2(password, useSalt, 100000, 64, 'sha512', (err, derivedKey) => {
      if (err) reject(err);
      else resolve({
        hash: derivedKey.toString('hex'),
        salt: useSalt
      });
    });
  });
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password: string, hash: string, salt: string): Promise<boolean> {
  const result = await hashPassword(password, salt);
  return crypto.timingSafeEqual(Buffer.from(result.hash), Buffer.from(hash));
}

/**
 * Log security events for auditing
 */
export function logSecurityEvent(event: {
  type: 'auth_success' | 'auth_failure' | 'rate_limit' | 'suspicious_input' | 'error';
  message: string;
  ip?: string;
  user?: string;
  metadata?: Record<string, any>;
}): void {
  if (process.env.MORPHBOX_AUDIT_LOG !== 'true') {
    return;
  }

  const logEntry = {
    timestamp: new Date().toISOString(),
    ...event
  };

  // Log to console (in production, this should go to a proper audit log)
  console.log('[SECURITY AUDIT]', JSON.stringify(logEntry));

  // Send to webhook if configured
  const webhookUrl = process.env.MORPHBOX_SECURITY_WEBHOOK_URL;
  if (webhookUrl) {
    // Fire and forget webhook notification
    fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(logEntry)
    }).catch(err => console.error('[SECURITY] Webhook error:', err));
  }
}

/**
 * Validate file paths to prevent directory traversal
 */
export function isPathSafe(path: string, allowedBase: string): boolean {
  // Normalize paths
  const normalizedPath = path.replace(/\\/g, '/');
  const normalizedBase = allowedBase.replace(/\\/g, '/');

  // Check for directory traversal attempts
  if (normalizedPath.includes('../') || normalizedPath.includes('..\\')) {
    return false;
  }

  // Check for absolute paths
  if (normalizedPath.startsWith('/') || /^[a-zA-Z]:/.test(normalizedPath)) {
    return false;
  }

  // Check for null bytes
  if (normalizedPath.includes('\0')) {
    return false;
  }

  return true;
}

/**
 * Get client IP address from request
 */
export function getClientIp(event: RequestEvent): string {
  // Check various headers for real IP (when behind proxy)
  const forwarded = event.request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  const realIp = event.request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  return event.getClientAddress();
}

/**
 * Validate and sanitize environment configuration
 */
export function validateSecurityConfig(): void {
  const warnings: string[] = [];

  // Check for default/weak passwords
  if (process.env.MORPHBOX_AUTH_PASSWORD === 'CHANGE_THIS_TO_STRONG_PASSWORD') {
    warnings.push('Default authentication password detected. Please change it!');
  }

  if (process.env.MORPHBOX_VM_PASSWORD === 'CHANGE_THIS_TO_STRONG_PASSWORD') {
    warnings.push('Default VM password detected. Please change it!');
  }

  // Check for missing security configurations
  if (!process.env.MORPHBOX_VM_PASSWORD) {
    warnings.push('MORPHBOX_VM_PASSWORD is not set. SSH access will fail.');
  }

  // Check for insecure configurations
  if (process.env.NODE_ENV !== 'production' && process.env.MORPHBOX_HOST === '0.0.0.0') {
    warnings.push('Running in development mode with external access enabled. This is insecure!');
  }

  // Log warnings
  if (warnings.length > 0) {
    console.warn('=== SECURITY CONFIGURATION WARNINGS ===');
    warnings.forEach(warning => console.warn(`⚠️  ${warning}`));
    console.warn('========================================');
  }
}

// Run validation on module load
validateSecurityConfig();