<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { 
    GitBranch, GitCommit, GitPullRequest, RefreshCw, 
    Plus, Minus, FileText, FileX, FilePlus, 
    ChevronDown, ChevronRight, Check, X,
    Upload, Download, RotateCcw, GitMerge
  } from 'lucide-svelte';
  import { gitStore, stagedFiles, unstagedFiles, hasChanges, type GitFile } from './git-store';
  
  let activeTab: 'changes' | 'history' | 'branches' = 'changes';
  let commitMessage = '';
  let selectedBranch = '';
  let showBranchMenu = false;
  let refreshInterval: number;
  let expandedSections = {
    staged: true,
    unstaged: true
  };
  
  // Auto-refresh every 5 seconds
  onMount(async () => {
    await refreshGitStatus();
    refreshInterval = window.setInterval(refreshGitStatus, 5000);
  });
  
  onDestroy(() => {
    if (refreshInterval) {
      clearInterval(refreshInterval);
    }
  });
  
  async function refreshGitStatus() {
    gitStore.setLoading(true);
    
    try {
      // Fetch git status
      const statusResponse = await fetch('/api/git/status');
      if (statusResponse.ok) {
        const status = await statusResponse.json();
        gitStore.updateStatus({
          files: status.files || [],
          branches: status.branches || [],
          currentBranch: status.currentBranch || 'main'
        });
      }
      
      // Fetch recent commits if on history tab
      if (activeTab === 'history') {
        const commitsResponse = await fetch('/api/git/commits?limit=50');
        if (commitsResponse.ok) {
          const commits = await commitsResponse.json();
          gitStore.updateCommits(commits);
        }
      }
    } catch (error) {
      console.error('[GitPanel] Error refreshing git status:', error);
    } finally {
      gitStore.setLoading(false);
    }
  }
  
  async function stageFile(file: GitFile) {
    try {
      const response = await fetch('/api/git/stage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: file.path })
      });
      
      if (response.ok) {
        // Refresh git status to get actual state from git
        await refreshGitStatus();
      }
    } catch (error) {
      console.error('[GitPanel] Error staging file:', error);
    }
  }
  
  async function unstageFile(file: GitFile) {
    try {
      const response = await fetch('/api/git/unstage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: file.path })
      });
      
      if (response.ok) {
        // Refresh git status to get actual state from git
        await refreshGitStatus();
      }
    } catch (error) {
      console.error('[GitPanel] Error unstaging file:', error);
    }
  }
  
  async function commit() {
    if (!commitMessage.trim() || $stagedFiles.length === 0) return;
    
    try {
      const response = await fetch('/api/git/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: commitMessage })
      });
      
      if (response.ok) {
        commitMessage = '';
        await refreshGitStatus();
      } else {
        const error = await response.json();
        console.error('[GitPanel] Commit failed:', error);
        alert(`Failed to commit: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('[GitPanel] Error committing:', error);
      alert(`Failed to commit: ${error}`);
    }
  }
  
  async function push() {
    try {
      const response = await fetch('/api/git/push', {
        method: 'POST'
      });
      
      if (response.ok) {
        await refreshGitStatus();
      }
    } catch (error) {
      console.error('[GitPanel] Error pushing:', error);
    }
  }
  
  async function pull() {
    try {
      const response = await fetch('/api/git/pull', {
        method: 'POST'
      });
      
      if (response.ok) {
        await refreshGitStatus();
      }
    } catch (error) {
      console.error('[GitPanel] Error pulling:', error);
    }
  }
  
  async function discardChanges(file: GitFile) {
    if (!confirm(`Discard changes to ${file.path}?`)) return;
    
    try {
      const response = await fetch('/api/git/discard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: file.path })
      });
      
      if (response.ok) {
        await refreshGitStatus();
      }
    } catch (error) {
      console.error('[GitPanel] Error discarding changes:', error);
    }
  }
  
  async function switchBranch(branchName: string) {
    try {
      const response = await fetch('/api/git/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ branch: branchName })
      });
      
      if (response.ok) {
        showBranchMenu = false;
        await refreshGitStatus();
      }
    } catch (error) {
      console.error('[GitPanel] Error switching branch:', error);
    }
  }
  
  function getFileIcon(status: string) {
    switch (status) {
      case 'added': return FilePlus;
      case 'deleted': return FileX;
      default: return FileText;
    }
  }
  
  function getStatusColor(status: string) {
    switch (status) {
      case 'added': return 'status-added';
      case 'deleted': return 'status-deleted';
      case 'modified': return 'status-modified';
      case 'renamed': return 'status-renamed';
      case 'untracked': return 'status-untracked';
      default: return '';
    }
  }
  
  // Switch to history tab when requested
  $: if (activeTab === 'history' && $gitStore.commits.length === 0) {
    refreshGitStatus();
  }
</script>

<div class="git-panel-container">
  <div class="panel-header">
    <div class="header-left">
      <GitBranch size={18} />
      <div class="branch-selector">
        <button 
          class="branch-button"
          on:click={() => showBranchMenu = !showBranchMenu}
        >
          {$gitStore.currentBranch || 'main'}
          <ChevronDown size={14} />
        </button>
        
        {#if showBranchMenu}
          <div class="branch-menu">
            {#each $gitStore.branches as branch}
              <button
                class="branch-option"
                class:active={branch.current}
                on:click={() => switchBranch(branch.name)}
              >
                {branch.name}
                {#if branch.current}
                  <Check size={14} />
                {/if}
              </button>
            {/each}
          </div>
        {/if}
      </div>
    </div>
    
    <div class="header-right">
      <button 
        class="icon-button"
        on:click={pull}
        title="Pull from remote"
      >
        <Download size={16} />
      </button>
      <button 
        class="icon-button"
        on:click={push}
        title="Push to remote"
      >
        <Upload size={16} />
      </button>
      <button 
        class="icon-button"
        on:click={refreshGitStatus}
        class:loading={$gitStore.loading}
        title="Refresh"
      >
        <RefreshCw size={16} />
      </button>
    </div>
  </div>
  
  <div class="tabs">
    <button 
      class="tab"
      class:active={activeTab === 'changes'}
      on:click={() => activeTab = 'changes'}
    >
      Changes
      {#if $hasChanges}
        <span class="badge">{$gitStore.files.length}</span>
      {/if}
    </button>
    <button 
      class="tab"
      class:active={activeTab === 'history'}
      on:click={() => activeTab = 'history'}
    >
      History
    </button>
    <button 
      class="tab"
      class:active={activeTab === 'branches'}
      on:click={() => activeTab = 'branches'}
    >
      Branches
    </button>
  </div>
  
  <div class="panel-content">
    {#if activeTab === 'changes'}
      <div class="changes-view">
        {#if $hasChanges}
          <div class="commit-section">
            <textarea
              bind:value={commitMessage}
              placeholder="Commit message..."
              class="commit-input"
            />
            <button 
              class="commit-button"
              on:click={commit}
              disabled={!commitMessage.trim() || $stagedFiles.length === 0}
            >
              <GitCommit size={16} />
              Commit
            </button>
          </div>
          
          <div class="file-sections">
            <div class="section">
              <button 
                class="section-header"
                on:click={() => expandedSections.staged = !expandedSections.staged}
              >
                {#if expandedSections.staged}
                  <ChevronDown size={16} />
                {:else}
                  <ChevronRight size={16} />
                {/if}
                Staged Changes
                <span class="count">{$stagedFiles.length}</span>
              </button>
              
              {#if expandedSections.staged}
                <div class="file-list">
                  {#each $stagedFiles as file}
                    <div class="file-item {getStatusColor(file.status)}">
                      <svelte:component this={getFileIcon(file.status)} size={16} />
                      <span class="file-path">{file.path}</span>
                      <button 
                        class="file-action"
                        on:click={() => unstageFile(file)}
                        title="Unstage"
                      >
                        <Minus size={14} />
                      </button>
                    </div>
                  {/each}
                </div>
              {/if}
            </div>
            
            <div class="section">
              <button 
                class="section-header"
                on:click={() => expandedSections.unstaged = !expandedSections.unstaged}
              >
                {#if expandedSections.unstaged}
                  <ChevronDown size={16} />
                {:else}
                  <ChevronRight size={16} />
                {/if}
                Changes
                <span class="count">{$unstagedFiles.length}</span>
              </button>
              
              {#if expandedSections.unstaged}
                <div class="file-list">
                  {#each $unstagedFiles as file}
                    <div class="file-item {getStatusColor(file.status)}">
                      <svelte:component this={getFileIcon(file.status)} size={16} />
                      <span class="file-path">{file.path}</span>
                      <div class="file-actions">
                        <button 
                          class="file-action"
                          on:click={() => stageFile(file)}
                          title="Stage"
                        >
                          <Plus size={14} />
                        </button>
                        <button 
                          class="file-action danger"
                          on:click={() => discardChanges(file)}
                          title="Discard changes"
                        >
                          <RotateCcw size={14} />
                        </button>
                      </div>
                    </div>
                  {/each}
                </div>
              {/if}
            </div>
          </div>
        {:else}
          <div class="empty-state">
            <p>No changes in working directory</p>
          </div>
        {/if}
      </div>
    {:else if activeTab === 'history'}
      <div class="history-view">
        {#if $gitStore.commits.length > 0}
          <div class="commit-list">
            {#each $gitStore.commits as commit}
              <div class="commit-item">
                <div class="commit-header">
                  <span class="commit-hash">{commit.shortHash}</span>
                  <span class="commit-author">{commit.author}</span>
                  <span class="commit-date">{new Date(commit.date).toLocaleDateString()}</span>
                </div>
                <div class="commit-message">{commit.message}</div>
              </div>
            {/each}
          </div>
        {:else}
          <div class="empty-state">
            <p>Loading commit history...</p>
          </div>
        {/if}
      </div>
    {:else if activeTab === 'branches'}
      <div class="branches-view">
        <div class="branch-list">
          {#each $gitStore.branches as branch}
            <div class="branch-item" class:current={branch.current}>
              <GitBranch size={16} />
              <span class="branch-name">{branch.name}</span>
              {#if branch.current}
                <span class="current-badge">current</span>
              {/if}
              {#if !branch.current}
                <button 
                  class="checkout-button"
                  on:click={() => switchBranch(branch.name)}
                >
                  Checkout
                </button>
              {/if}
            </div>
          {/each}
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  .git-panel-container {
    display: flex;
    flex-direction: column;
    height: 100%;
    background-color: var(--bg-color, #2d2d30);
    color: var(--text-color, #cccccc);
  }
  
  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    border-bottom: 1px solid var(--border-color, #3e3e42);
  }
  
  .header-left {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  
  .branch-selector {
    position: relative;
  }
  
  .branch-button {
    background: none;
    border: 1px solid var(--border-color, #3e3e42);
    color: var(--text-color, #cccccc);
    padding: 4px 12px;
    border-radius: 4px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 13px;
  }
  
  .branch-button:hover {
    background-color: rgba(255, 255, 255, 0.1);
  }
  
  .branch-menu {
    position: absolute;
    top: 100%;
    left: 0;
    margin-top: 4px;
    background-color: var(--panel-bg, #252526);
    border: 1px solid var(--border-color, #3e3e42);
    border-radius: 4px;
    min-width: 150px;
    max-height: 300px;
    overflow-y: auto;
    z-index: 100;
  }
  
  .branch-option {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    background: none;
    border: none;
    color: var(--text-color, #cccccc);
    padding: 8px 12px;
    text-align: left;
    cursor: pointer;
    font-size: 13px;
  }
  
  .branch-option:hover {
    background-color: rgba(255, 255, 255, 0.1);
  }
  
  .branch-option.active {
    background-color: var(--accent-color, #007acc);
    color: white;
  }
  
  .header-right {
    display: flex;
    gap: 4px;
  }
  
  .icon-button {
    background: none;
    border: 1px solid var(--border-color, #3e3e42);
    color: var(--text-color, #cccccc);
    padding: 6px;
    border-radius: 4px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
  }
  
  .icon-button:hover {
    background-color: rgba(255, 255, 255, 0.1);
  }
  
  .icon-button.loading {
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  
  .tabs {
    display: flex;
    border-bottom: 1px solid var(--border-color, #3e3e42);
  }
  
  .tab {
    flex: 1;
    background: none;
    border: none;
    color: var(--text-color, #cccccc);
    padding: 8px 16px;
    cursor: pointer;
    position: relative;
    font-size: 13px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
  }
  
  .tab:hover {
    background-color: rgba(255, 255, 255, 0.05);
  }
  
  .tab.active {
    color: var(--accent-color, #007acc);
  }
  
  .tab.active::after {
    content: '';
    position: absolute;
    bottom: -1px;
    left: 0;
    right: 0;
    height: 2px;
    background-color: var(--accent-color, #007acc);
  }
  
  .badge {
    background-color: var(--accent-color, #007acc);
    color: white;
    padding: 2px 6px;
    border-radius: 10px;
    font-size: 11px;
    font-weight: bold;
  }
  
  .panel-content {
    flex: 1;
    overflow-y: auto;
  }
  
  .changes-view {
    display: flex;
    flex-direction: column;
    height: 100%;
  }
  
  .commit-section {
    padding: 12px;
    border-bottom: 1px solid var(--border-color, #3e3e42);
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  
  .commit-input {
    background-color: var(--input-bg, #3c3c3c);
    color: var(--text-color, #cccccc);
    border: 1px solid var(--border-color, #3e3e42);
    border-radius: 4px;
    padding: 8px;
    font-family: inherit;
    font-size: 13px;
    resize: vertical;
    min-height: 60px;
  }
  
  .commit-input:focus {
    outline: none;
    border-color: var(--accent-color, #007acc);
  }
  
  .commit-button {
    background-color: var(--accent-color, #007acc);
    color: white;
    border: none;
    border-radius: 4px;
    padding: 8px 16px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 6px;
    justify-content: center;
    font-size: 13px;
    transition: background-color 0.2s;
  }
  
  .commit-button:hover:not(:disabled) {
    background-color: #0086e6;
  }
  
  .commit-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .file-sections {
    flex: 1;
    overflow-y: auto;
  }
  
  .section {
    border-bottom: 1px solid var(--border-color, #3e3e42);
  }
  
  .section-header {
    width: 100%;
    background: none;
    border: none;
    color: var(--text-color, #cccccc);
    padding: 8px 12px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    text-align: left;
  }
  
  .section-header:hover {
    background-color: rgba(255, 255, 255, 0.05);
  }
  
  .count {
    margin-left: auto;
    background-color: rgba(255, 255, 255, 0.1);
    padding: 2px 6px;
    border-radius: 10px;
    font-size: 11px;
  }
  
  .file-list {
    padding: 0 12px 8px;
  }
  
  .file-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 8px;
    border-radius: 4px;
    font-size: 13px;
    margin-bottom: 2px;
  }
  
  .file-item:hover {
    background-color: rgba(255, 255, 255, 0.05);
  }
  
  .file-path {
    flex: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  
  .file-actions {
    display: flex;
    gap: 4px;
  }
  
  .file-action {
    background: none;
    border: 1px solid var(--border-color, #3e3e42);
    color: var(--text-color, #cccccc);
    padding: 4px;
    border-radius: 4px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .file-action:hover {
    background-color: rgba(255, 255, 255, 0.1);
  }
  
  .file-action.danger:hover {
    background-color: rgba(220, 53, 69, 0.2);
    border-color: #dc3545;
    color: #dc3545;
  }
  
  .status-added {
    color: #28a745;
  }
  
  .status-modified {
    color: #ffc107;
  }
  
  .status-deleted {
    color: #dc3545;
  }
  
  .status-renamed {
    color: #17a2b8;
  }
  
  .status-untracked {
    color: #6c757d;
  }
  
  .empty-state {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: var(--text-secondary, #858585);
    font-size: 14px;
  }
  
  .history-view {
    padding: 12px;
  }
  
  .commit-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  
  .commit-item {
    background-color: var(--input-bg, #3c3c3c);
    border: 1px solid var(--border-color, #3e3e42);
    border-radius: 4px;
    padding: 12px;
  }
  
  .commit-header {
    display: flex;
    gap: 12px;
    margin-bottom: 8px;
    font-size: 12px;
    color: var(--text-secondary, #858585);
  }
  
  .commit-hash {
    font-family: monospace;
    color: var(--accent-color, #007acc);
  }
  
  .commit-message {
    font-size: 13px;
    line-height: 1.4;
  }
  
  .branches-view {
    padding: 12px;
  }
  
  .branch-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  
  .branch-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    background-color: var(--input-bg, #3c3c3c);
    border: 1px solid var(--border-color, #3e3e42);
    border-radius: 4px;
  }
  
  .branch-item.current {
    border-color: var(--accent-color, #007acc);
  }
  
  .branch-name {
    flex: 1;
    font-size: 13px;
  }
  
  .current-badge {
    background-color: var(--accent-color, #007acc);
    color: white;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 11px;
  }
  
  .checkout-button {
    background: none;
    border: 1px solid var(--border-color, #3e3e42);
    color: var(--text-color, #cccccc);
    padding: 4px 12px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
  }
  
  .checkout-button:hover {
    background-color: rgba(255, 255, 255, 0.1);
  }
</style>