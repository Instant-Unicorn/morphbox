import { json, redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { validateBasicAuth, getAuthConfig, generateAuthToken } from '$lib/server/auth';

export const POST: RequestHandler = async ({ request, cookies }) => {
  const config = getAuthConfig();
  
  if (!config.enabled) {
    return json({ success: true, message: 'Authentication is disabled' });
  }
  
  try {
    const contentType = request.headers.get('content-type');
    
    // Handle form submission from HTML form
    if (contentType?.includes('application/x-www-form-urlencoded')) {
      const formData = await request.formData();
      const username = formData.get('username')?.toString() || '';
      const password = formData.get('password')?.toString() || '';
      
      if (validateBasicAuth(username, password)) {
        // Generate a session token
        const token = generateAuthToken();
        
        // Set auth cookie with the token
        cookies.set('morphbox-auth-token', token, {
          path: '/',
          httpOnly: true,
          secure: false, // Set to true in production with HTTPS
          sameSite: 'strict',
          maxAge: 60 * 60 * 24 * 7 // 7 days
        });
        
        // Store the token in memory for validation (in production, use a proper session store)
        if (!config.token) {
          // Temporarily store the generated token
          process.env.MORPHBOX_AUTH_TOKEN = token;
        }
        
        // Redirect to home page
        throw redirect(303, '/');
      } else {
        // Return to login with error
        throw redirect(303, '/login?error=invalid');
      }
    }
    
    // Handle API-style JSON/FormData requests
    const formData = await request.formData();
    const username = formData.get('username')?.toString() || '';
    const password = formData.get('password')?.toString() || '';
    
    if (validateBasicAuth(username, password)) {
      // Generate a session token
      const token = generateAuthToken();
      
      // Set auth cookie
      cookies.set('morphbox-auth-token', token, {
        path: '/',
        httpOnly: true,
        secure: false, // Set to true in production with HTTPS
        sameSite: 'strict',
        maxAge: 60 * 60 * 24 * 7 // 7 days
      });
      
      // Store the token in memory for validation
      if (!config.token) {
        process.env.MORPHBOX_AUTH_TOKEN = token;
      }
      
      return json({ success: true, message: 'Login successful' });
    } else {
      return json({ success: false, message: 'Invalid credentials' }, { status: 401 });
    }
  } catch (error) {
    // Re-throw redirects
    if (error instanceof Response && error.status >= 300 && error.status < 400) {
      throw error;
    }
    
    console.error('Login error:', error);
    return json({ success: false, message: 'Login failed' }, { status: 500 });
  }
};