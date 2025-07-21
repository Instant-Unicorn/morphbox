<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { Monitor, Trash2, RefreshCw, Circle } from 'lucide-svelte';
  
  interface Session {
    id: string;
    type: string;
    status: 'active' | 'detached' | 'dead';
    createdAt: Date;
    lastActivity: Date;
    metadata: {
      cols?: number;
      rows?: number;
      command?: string;
      cwd?: string;
    };
  }
  
  let sessions: Session[] = [];
  let loading = true;
  let error = '';
  let refreshInterval: number | null = null;
  
  async function loadSessions() {
    try {
      const response = await fetch('/api/sessions');
      if (!response.ok) {
        throw new Error(`Failed to load sessions: ${response.statusText}`);
      }
      
      const data = await response.json();
      sessions = data.sessions.map((s: any) => ({
        ...s,
        createdAt: new Date(s.createdAt),
        lastActivity: new Date(s.lastActivity)
      }));
      error = '';
    } catch (err) {
      console.error('Error loading sessions:', err);
      error = err instanceof Error ? err.message : 'Failed to load sessions';
    } finally {
      loading = false;
    }
  }
  
  async function killSession(sessionId: string) {
    if (!confirm('Are you sure you want to terminate this session? This cannot be undone.')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/sessions?sessionId=${sessionId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to terminate session: ${response.statusText}`);
      }
      
      // Reload sessions
      await loadSessions();
    } catch (err) {
      console.error('Error terminating session:', err);
      error = err instanceof Error ? err.message : 'Failed to terminate session';
    }
  }
  
  function formatDate(date: Date): string {
    return date.toLocaleString();
  }
  
  function getStatusColor(status: string): string {
    switch (status) {
      case 'active':
        return '#4ade80'; // green
      case 'detached':
        return '#fbbf24'; // yellow
      case 'dead':
        return '#ef4444'; // red
      default:
        return '#6b7280'; // gray
    }
  }
  
  function getTimeAgo(date: Date): string {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    
    if (seconds < 60) {
      return `${seconds}s ago`;
    } else if (seconds < 3600) {
      return `${Math.floor(seconds / 60)}m ago`;
    } else if (seconds < 86400) {
      return `${Math.floor(seconds / 3600)}h ago`;
    } else {
      return `${Math.floor(seconds / 86400)}d ago`;
    }
  }
  
  onMount(() => {
    loadSessions();
    // Refresh every 10 seconds
    refreshInterval = window.setInterval(loadSessions, 10000);
  });
  
  onDestroy(() => {
    if (refreshInterval !== null) {
      clearInterval(refreshInterval);
    }
  });
</script>

<div class="session-manager">
  <div class="header">
    <h2>Persistent Sessions</h2>
    <button class="refresh-btn" on:click={loadSessions} disabled={loading}>
      <RefreshCw size={16} class:spinning={loading} />
      Refresh
    </button>
  </div>
  
  {#if error}
    <div class="error">{error}</div>
  {/if}
  
  {#if loading && sessions.length === 0}
    <div class="loading">Loading sessions...</div>
  {:else if sessions.length === 0}
    <div class="empty">No active sessions</div>
  {:else}
    <div class="sessions">
      {#each sessions as session}
        <div class="session-card">
          <div class="session-header">
            <div class="session-info">
              <h3>
                <Circle 
                  size={12} 
                  fill={getStatusColor(session.status)} 
                  color={getStatusColor(session.status)} 
                />
                {session.id.substring(0, 8)}...
              </h3>
              <span class="session-type">{session.type}</span>
            </div>
            <button 
              class="kill-btn" 
              on:click={() => killSession(session.id)}
              title="Terminate session"
            >
              <Trash2 size={16} />
            </button>
          </div>
          
          <div class="session-details">
            <div class="detail">
              <span class="label">Status:</span>
              <span class="value status-{session.status}">{session.status}</span>
            </div>
            
            <div class="detail">
              <span class="label">Created:</span>
              <span class="value" title={formatDate(session.createdAt)}>
                {getTimeAgo(session.createdAt)}
              </span>
            </div>
            
            <div class="detail">
              <span class="label">Last activity:</span>
              <span class="value" title={formatDate(session.lastActivity)}>
                {getTimeAgo(session.lastActivity)}
              </span>
            </div>
            
            {#if session.metadata.command}
              <div class="detail">
                <span class="label">Command:</span>
                <span class="value code">{session.metadata.command}</span>
              </div>
            {/if}
            
            {#if session.metadata.cols && session.metadata.rows}
              <div class="detail">
                <span class="label">Size:</span>
                <span class="value">{session.metadata.cols}×{session.metadata.rows}</span>
              </div>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  {/if}
  
  <div class="footer">
    <p class="info">
      <Monitor size={16} />
      Sessions persist even when the browser is closed. Reconnect to any detached session from a terminal.
    </p>
  </div>
</div>

<style>
  .session-manager {
    height: 100%;
    display: flex;
    flex-direction: column;
    padding: 1rem;
    color: var(--text-primary, #d4d4d4);
    background: var(--bg-primary, #1e1e1e);
    overflow: hidden;
  }
  
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid var(--border-color, #444);
  }
  
  .header h2 {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 600;
  }
  
  .refresh-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    background: var(--button-bg, #333);
    border: 1px solid var(--border-color, #444);
    border-radius: 0.25rem;
    color: var(--text-primary, #d4d4d4);
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .refresh-btn:hover:not(:disabled) {
    background: var(--button-hover-bg, #444);
  }
  
  .refresh-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .refresh-btn :global(.spinning) {
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  
  .error {
    padding: 1rem;
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.3);
    border-radius: 0.25rem;
    color: #ef4444;
    margin-bottom: 1rem;
  }
  
  .loading, .empty {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-secondary, #999);
  }
  
  .sessions {
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  
  .session-card {
    background: var(--card-bg, #2a2a2a);
    border: 1px solid var(--border-color, #444);
    border-radius: 0.5rem;
    padding: 1rem;
  }
  
  .session-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.75rem;
  }
  
  .session-info {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
  
  .session-info h3 {
    margin: 0;
    font-size: 1rem;
    font-weight: 500;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  
  .session-type {
    font-size: 0.875rem;
    color: var(--text-secondary, #999);
    background: var(--bg-secondary, #333);
    padding: 0.125rem 0.5rem;
    border-radius: 0.25rem;
  }
  
  .kill-btn {
    padding: 0.25rem;
    background: transparent;
    border: none;
    color: var(--text-secondary, #999);
    cursor: pointer;
    border-radius: 0.25rem;
    transition: all 0.2s;
  }
  
  .kill-btn:hover {
    color: #ef4444;
    background: rgba(239, 68, 68, 0.1);
  }
  
  .session-details {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    font-size: 0.875rem;
  }
  
  .detail {
    display: flex;
    gap: 0.5rem;
  }
  
  .label {
    color: var(--text-secondary, #999);
    min-width: 100px;
  }
  
  .value {
    color: var(--text-primary, #d4d4d4);
  }
  
  .value.code {
    font-family: 'Cascadia Code', 'Fira Code', monospace;
    font-size: 0.8125rem;
    background: var(--bg-secondary, #333);
    padding: 0.125rem 0.5rem;
    border-radius: 0.25rem;
  }
  
  .status-active {
    color: #4ade80;
  }
  
  .status-detached {
    color: #fbbf24;
  }
  
  .status-dead {
    color: #ef4444;
  }
  
  .footer {
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid var(--border-color, #444);
  }
  
  .info {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin: 0;
    font-size: 0.875rem;
    color: var(--text-secondary, #999);
  }
</style>