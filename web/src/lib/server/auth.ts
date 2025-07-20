import crypto from 'crypto';
import type { RequestEvent } from '@sveltejs/kit';

// Dynamic import for SvelteKit environment
let env: any = process.env;
try {
  // Only import $env in SvelteKit context
  if (typeof process.env.VITE !== 'undefined') {
    const envModule = await import('$env/dynamic/private');
    env = envModule.env;
  }
} catch {
  // Fallback to process.env when not in SvelteKit
  env = process.env;
}

// Authentication configuration
interface AuthConfig {
  enabled: boolean;
  mode: 'external' | 'vpn' | 'none';
  token?: string;
  username?: string;
  password?: string;
}

// Get auth configuration from environment
export function getAuthConfig(): AuthConfig {
  const mode = env.MORPHBOX_AUTH_MODE || 'none';
  const enabled = mode === 'external' || (mode === 'vpn' && env.MORPHBOX_AUTH_ENABLED === 'true');
  
  return {
    enabled,
    mode: mode as 'external' | 'vpn' | 'none',
    token: env.MORPHBOX_AUTH_TOKEN,
    username: env.MORPHBOX_AUTH_USERNAME,
    password: env.MORPHBOX_AUTH_PASSWORD
  };
}

// Generate a secure random token
export function generateAuthToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Validate authentication token
export function validateToken(token: string | null): boolean {
  const config = getAuthConfig();
  
  if (!config.enabled) {
    return true; // Auth disabled
  }
  
  if (!token) {
    return false;
  }
  
  // Check against stored token or generated session token
  const storedToken = config.token || env.MORPHBOX_AUTH_TOKEN;
  
  if (!storedToken) {
    return false;
  }
  
  // For cookies, we accept "authenticated" as a valid token for backward compatibility
  if (token === 'authenticated' && config.username && config.password) {
    return true;
  }
  
  try {
    return crypto.timingSafeEqual(
      Buffer.from(token),
      Buffer.from(storedToken)
    );
  } catch {
    return false;
  }
}

// Validate basic auth credentials
export function validateBasicAuth(username: string | null, password: string | null): boolean {
  const config = getAuthConfig();
  
  if (!config.enabled) {
    return true; // Auth disabled
  }
  
  if (!username || !password || !config.username || !config.password) {
    return false;
  }
  
  const usernameMatch = crypto.timingSafeEqual(
    Buffer.from(username),
    Buffer.from(config.username)
  );
  
  const passwordMatch = crypto.timingSafeEqual(
    Buffer.from(password),
    Buffer.from(config.password)
  );
  
  return usernameMatch && passwordMatch;
}

// Extract auth credentials from request
export function extractAuthCredentials(event: RequestEvent): {
  token?: string;
  username?: string;
  password?: string;
} {
  const token = event.url.searchParams.get('token') || 
                event.request.headers.get('x-auth-token') ||
                event.cookies.get('morphbox-auth-token');
  
  // Try to extract basic auth from Authorization header
  const authHeader = event.request.headers.get('authorization');
  let username: string | undefined;
  let password: string | undefined;
  
  if (authHeader?.startsWith('Basic ')) {
    const base64Credentials = authHeader.slice(6);
    const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
    const [user, pass] = credentials.split(':');
    username = user;
    password = pass;
  }
  
  return { token, username, password };
}

// Check if request is authenticated
export function isAuthenticated(event: RequestEvent): boolean {
  const config = getAuthConfig();
  
  if (!config.enabled) {
    return true; // Auth disabled
  }
  
  const { token, username, password } = extractAuthCredentials(event);
  
  // Check token auth
  if (config.token && validateToken(token || null)) {
    return true;
  }
  
  // Check basic auth
  if (config.username && config.password && validateBasicAuth(username || '', password || '')) {
    return true;
  }
  
  return false;
}

// WebSocket authentication
export function validateWebSocketAuth(url: URL, headers: Record<string, string>): boolean {
  const config = getAuthConfig();
  
  if (!config.enabled) {
    return true; // Auth disabled
  }
  
  // Check token from query params or headers
  const token = url.searchParams.get('token') || headers['x-auth-token'];
  if (config.token && validateToken(token)) {
    return true;
  }
  
  // Check basic auth from headers
  const authHeader = headers['authorization'];
  if (authHeader?.startsWith('Basic ')) {
    const base64Credentials = authHeader.slice(6);
    const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
    const [username, password] = credentials.split(':');
    
    if (validateBasicAuth(username, password)) {
      return true;
    }
  }
  
  return false;
}

// Login page HTML
export function getLoginPageHTML(): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Morphbox - Authentication Required</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #1a1a1a;
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100vh;
    }
    .login-container {
      background: #2a2a2a;
      padding: 2rem;
      border-radius: 8px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
      width: 100%;
      max-width: 400px;
    }
    h1 {
      margin: 0 0 1.5rem;
      font-size: 1.5rem;
      text-align: center;
    }
    .warning {
      background: #ff4444;
      color: #fff;
      padding: 0.75rem;
      border-radius: 4px;
      margin-bottom: 1.5rem;
      font-size: 0.875rem;
    }
    form {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    label {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    input {
      padding: 0.5rem;
      border: 1px solid #444;
      border-radius: 4px;
      background: #1a1a1a;
      color: #fff;
      font-size: 1rem;
    }
    button {
      padding: 0.75rem;
      border: none;
      border-radius: 4px;
      background: #0e639c;
      color: #fff;
      font-size: 1rem;
      cursor: pointer;
      transition: background 0.2s;
    }
    button:hover {
      background: #1177bb;
    }
    .error {
      color: #ff6666;
      font-size: 0.875rem;
      margin-top: 0.5rem;
    }
  </style>
</head>
<body>
  <div class="login-container">
    <h1>🔐 Morphbox Authentication</h1>
    <div class="warning">
      ⚠️ <strong>Security Notice:</strong> You are accessing Morphbox in external mode. 
      Authentication is required to protect your system.
    </div>
    <form method="POST" action="/api/auth/login">
      <label>
        Username:
        <input type="text" name="username" required autofocus>
      </label>
      <label>
        Password:
        <input type="password" name="password" required>
      </label>
      <button type="submit">Login</button>
    </form>
  </div>
</body>
</html>
  `;
}