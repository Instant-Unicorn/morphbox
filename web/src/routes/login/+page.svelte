<script lang="ts">
  import { goto } from '$app/navigation';
  import { browser } from '$app/environment';
  
  let username = '';
  let password = '';
  let error = '';
  let isLoading = false;
  
  async function handleLogin(e: Event) {
    e.preventDefault();
    error = '';
    isLoading = true;
    
    try {
      const formData = new FormData();
      formData.append('username', username);
      formData.append('password', password);
      
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        body: formData
      });
      
      const result = await response.json();
      
      if (result.success) {
        // Redirect to home page
        goto('/');
      } else {
        error = result.message || 'Login failed';
      }
    } catch (err) {
      error = 'An error occurred during login';
      console.error('Login error:', err);
    } finally {
      isLoading = false;
    }
  }
  
  // Auto-focus username field on mount
  import { onMount } from 'svelte';
  let usernameInput: HTMLInputElement;
  
  onMount(() => {
    if (usernameInput) {
      usernameInput.focus();
    }
  });
</script>

<style>
  .login-container {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--background);
    padding: 1rem;
  }
  
  .login-box {
    background: var(--surface);
    padding: 2rem;
    border-radius: 8px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
    width: 100%;
    max-width: 400px;
    border: 1px solid var(--border);
  }
  
  h1 {
    margin: 0 0 1.5rem;
    font-size: 1.5rem;
    text-align: center;
    color: var(--text);
  }
  
  .logo {
    text-align: center;
    font-size: 2rem;
    margin-bottom: 0.5rem;
  }
  
  .warning {
    background: var(--error);
    color: white;
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
    color: var(--text);
  }
  
  input {
    padding: 0.5rem;
    border: 1px solid var(--border);
    border-radius: 4px;
    background: var(--background);
    color: var(--text);
    font-size: 1rem;
  }
  
  input:focus {
    outline: none;
    border-color: var(--primary);
  }
  
  button {
    padding: 0.75rem;
    border: none;
    border-radius: 4px;
    background: var(--primary);
    color: white;
    font-size: 1rem;
    cursor: pointer;
    transition: background 0.2s;
  }
  
  button:hover:not(:disabled) {
    background: var(--primary-hover);
  }
  
  button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  
  .error-message {
    color: var(--error);
    font-size: 0.875rem;
    margin-top: 0.5rem;
    text-align: center;
  }
  
  .info {
    color: var(--text-secondary);
    font-size: 0.75rem;
    text-align: center;
    margin-top: 1rem;
  }
</style>

<div class="login-container">
  <div class="login-box">
    <div class="logo">🔐</div>
    <h1>Morphbox Authentication</h1>
    
    <div class="warning">
      ⚠️ <strong>Security Notice:</strong> You are accessing Morphbox in external mode. 
      Authentication is required to protect your system.
    </div>
    
    <form on:submit={handleLogin}>
      <label>
        Username:
        <input 
          bind:this={usernameInput}
          type="text" 
          bind:value={username}
          required 
          disabled={isLoading}
          autocomplete="username"
        />
      </label>
      
      <label>
        Password:
        <input 
          type="password" 
          bind:value={password}
          required 
          disabled={isLoading}
          autocomplete="current-password"
        />
      </label>
      
      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Logging in...' : 'Login'}
      </button>
    </form>
    
    {#if error}
      <div class="error-message">{error}</div>
    {/if}
    
    <div class="info">
      Credentials were displayed when Morphbox started
    </div>
  </div>
</div>