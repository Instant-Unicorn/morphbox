<script lang="ts">
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  
  // Documentation navigation structure
  const navigation = [
    {
      title: 'Getting Started',
      path: '/docs/getting-started',
      children: [
        { title: 'Overview', path: '/docs/getting-started/overview' },
        { title: 'Installation', path: '/docs/getting-started/installation' },
        { title: 'Quick Start', path: '/docs/getting-started/quick-start' },
        { title: 'System Requirements', path: '/docs/getting-started/requirements' }
      ]
    },
    {
      title: 'User Guide',
      path: '/docs/user-guide',
      children: [
        { title: 'Terminal Persistence', path: '/docs/user-guide/terminal-persistence' },
        { title: 'Custom Panels', path: '/docs/user-guide/custom-panels' },
        { title: 'Keyboard Shortcuts', path: '/docs/user-guide/keyboard-shortcuts' },
        { title: 'Mobile Usage', path: '/docs/user-guide/mobile-usage' },
        { title: 'Panel System', path: '/docs/user-guide/panels' },
        { title: 'Built-in Panels', path: '/docs/user-guide/builtin-panels' },
        { title: 'File Explorer', path: '/docs/user-guide/file-explorer' },
        { title: 'Code Editor', path: '/docs/user-guide/code-editor' },
        { title: 'Settings & Themes', path: '/docs/user-guide/settings-themes' }
      ]
    },
    {
      title: 'Features',
      path: '/docs/features',
      children: [
        { title: 'Overview', path: '/docs/features/overview' },
        { title: 'Session Persistence', path: '/docs/features/session-persistence' },
        { title: 'Custom Panels', path: '/docs/features/custom-panels' },
        { title: 'Security', path: '/docs/features/security' },
        { title: 'Performance', path: '/docs/features/performance' }
      ]
    },
    {
      title: 'API Reference',
      path: '/docs/api',
      children: [
        { title: 'Overview', path: '/docs/api-reference/overview' },
        { title: 'REST API', path: '/docs/api/rest' },
        { title: 'WebSocket API', path: '/docs/api/websocket' },
        { title: 'File Operations', path: '/docs/api/files' },
        { title: 'Session Management', path: '/docs/api/sessions' },
        { title: 'Panel API', path: '/docs/api/panels' }
      ]
    },
    {
      title: 'Contributing',
      path: '/docs/contributing',
      children: [
        { title: 'Development Setup', path: '/docs/contributing/development' },
        { title: 'Architecture', path: '/docs/contributing/architecture' },
        { title: 'Creating Panels', path: '/docs/contributing/creating-panels' },
        { title: 'Code Guidelines', path: '/docs/contributing/code-guidelines' },
        { title: 'Pull Requests', path: '/docs/contributing/pull-requests' }
      ]
    },
    {
      title: 'Help & Support',
      path: '/docs/support',
      children: [
        { title: 'Troubleshooting', path: '/docs/support/troubleshooting' },
        { title: 'FAQ', path: '/docs/support/faq' },
        { title: 'Known Issues', path: '/docs/support/known-issues' },
        { title: 'Community', path: '/docs/support/community' }
      ]
    }
  ];

  let sidebarOpen = false;
  let searchQuery = '';
  let searchResults = [];

  onMount(() => {
    // Auto-close sidebar on route change (mobile)
    const unsubscribe = page.subscribe(() => {
      if (window.innerWidth < 768) {
        sidebarOpen = false;
      }
    });

    return unsubscribe;
  });

  function toggleSidebar() {
    sidebarOpen = !sidebarOpen;
  }

  function isActivePath(itemPath) {
    return $page.url.pathname === itemPath || $page.url.pathname.startsWith(itemPath + '/');
  }

  function isParentActive(item) {
    if (isActivePath(item.path)) return true;
    return item.children?.some(child => isActivePath(child.path)) || false;
  }

  // Simple search functionality
  function handleSearch(event) {
    searchQuery = event.target.value;
    if (searchQuery.length > 2) {
      searchResults = navigation.flatMap(section => 
        [section, ...(section.children || [])]
      ).filter(item => 
        item.title.toLowerCase().includes(searchQuery.toLowerCase())
      ).slice(0, 5);
    } else {
      searchResults = [];
    }
  }
</script>

<div class="docs-container">
  <!-- Mobile Header -->
  <header class="docs-header mobile-only">
    <button class="sidebar-toggle" on:click={toggleSidebar} aria-label="Toggle navigation">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
      </svg>
    </button>
    <h1>MorphBox Docs</h1>
  </header>

  <!-- Sidebar -->
  <nav class="docs-sidebar" class:open={sidebarOpen}>
    <div class="sidebar-header">
      <h2>MorphBox Documentation</h2>
      <div class="search-container">
        <input 
          type="search" 
          placeholder="Search docs..."
          value={searchQuery}
          on:input={handleSearch}
          class="search-input"
        />
        {#if searchResults.length > 0}
          <div class="search-results">
            {#each searchResults as result}
              <a href={result.path} class="search-result">
                {result.title}
              </a>
            {/each}
          </div>
        {/if}
      </div>
    </div>

    <div class="sidebar-content">
      {#each navigation as section}
        <div class="nav-section">
          <a 
            href={section.path} 
            class="nav-section-title"
            class:active={isParentActive(section)}
          >
            {section.title}
          </a>
          {#if section.children && isParentActive(section)}
            <ul class="nav-children">
              {#each section.children as child}
                <li>
                  <a 
                    href={child.path}
                    class="nav-child-link"
                    class:active={isActivePath(child.path)}
                  >
                    {child.title}
                  </a>
                </li>
              {/each}
            </ul>
          {/if}
        </div>
      {/each}
    </div>
  </nav>

  <!-- Sidebar overlay for mobile -->
  {#if sidebarOpen}
    <div class="sidebar-overlay" on:click={toggleSidebar} on:keydown={(e) => e.key === 'Escape' && toggleSidebar()} role="button" tabindex="-1" aria-label="Close sidebar"></div>
  {/if}

  <!-- Main content -->
  <main class="docs-main">
    <slot />
  </main>
</div>

<style>
  :global(body:has(.docs-container)) {
    overflow: auto !important;
  }

  .docs-container {
    display: flex;
    height: 100vh;
    overflow: hidden;
    background-color: var(--bg-primary, #1e1e1e);
    color: var(--text-primary, #d4d4d4);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  /* Mobile Header */
  .docs-header {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: 60px;
    background-color: var(--bg-secondary, #2d2d30);
    border-bottom: 1px solid var(--border-color, #3e3e42);
    display: flex;
    align-items: center;
    padding: 0 16px;
    z-index: 100;
  }

  .mobile-only {
    display: none;
  }

  .sidebar-toggle {
    background: none;
    border: none;
    color: var(--text-primary, #d4d4d4);
    cursor: pointer;
    padding: 8px;
    margin-right: 12px;
    border-radius: 4px;
    transition: background-color 0.2s;
  }

  .sidebar-toggle:hover {
    background-color: var(--button-hover, #484848);
  }

  .docs-header h1 {
    font-size: 18px;
    margin: 0;
    font-weight: 600;
  }

  /* Sidebar */
  .docs-sidebar {
    width: 280px;
    background-color: var(--bg-secondary, #252526);
    border-right: 1px solid var(--border-color, #3e3e42);
    overflow-y: auto;
    position: fixed;
    top: 0;
    left: 0;
    height: 100vh;
    transform: translateX(-100%);
    transition: transform 0.3s ease;
    z-index: 200;
  }

  .docs-sidebar.open {
    transform: translateX(0);
  }

  .sidebar-header {
    padding: 24px 20px 16px;
    border-bottom: 1px solid var(--border-color, #3e3e42);
  }

  .sidebar-header h2 {
    font-size: 16px;
    margin: 0 0 16px 0;
    color: var(--text-secondary, #cccccc);
    font-weight: 600;
  }

  .search-container {
    position: relative;
  }

  .search-input {
    width: 100%;
    padding: 8px 12px;
    border: 1px solid var(--border-color, #3e3e42);
    border-radius: 6px;
    background-color: var(--bg-primary, #1e1e1e);
    color: var(--text-primary, #d4d4d4);
    font-size: 14px;
  }

  .search-input::placeholder {
    color: var(--text-tertiary, #858585);
  }

  .search-input:focus {
    outline: none;
    border-color: var(--accent-color, #4ec9b0);
  }

  .search-results {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background-color: var(--bg-primary, #1e1e1e);
    border: 1px solid var(--border-color, #3e3e42);
    border-radius: 6px;
    margin-top: 4px;
    z-index: 300;
    max-height: 200px;
    overflow-y: auto;
  }

  .search-result {
    display: block;
    padding: 8px 12px;
    color: var(--text-primary, #d4d4d4);
    text-decoration: none;
    border-bottom: 1px solid var(--border-color, #3e3e42);
    font-size: 14px;
  }

  .search-result:last-child {
    border-bottom: none;
  }

  .search-result:hover {
    background-color: var(--bg-hover, #2d2d30);
  }

  .sidebar-content {
    padding: 16px 0;
  }

  .nav-section {
    margin-bottom: 8px;
  }

  .nav-section-title {
    display: block;
    padding: 8px 20px;
    color: var(--text-secondary, #cccccc);
    text-decoration: none;
    font-weight: 500;
    font-size: 14px;
    transition: background-color 0.2s;
  }

  .nav-section-title:hover {
    background-color: var(--bg-hover, #2d2d30);
  }

  .nav-section-title.active {
    background-color: var(--bg-hover, #2d2d30);
    color: var(--accent-color, #4ec9b0);
  }

  .nav-children {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .nav-child-link {
    display: block;
    padding: 6px 20px 6px 40px;
    color: var(--text-tertiary, #858585);
    text-decoration: none;
    font-size: 13px;
    transition: all 0.2s;
  }

  .nav-child-link:hover {
    background-color: var(--bg-hover, #2d2d30);
    color: var(--text-primary, #d4d4d4);
  }

  .nav-child-link.active {
    background-color: var(--bg-hover, #2d2d30);
    color: var(--accent-color, #4ec9b0);
    border-right: 2px solid var(--accent-color, #4ec9b0);
  }

  .sidebar-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    z-index: 150;
  }

  /* Main content */
  .docs-main {
    flex: 1;
    padding: 40px;
    margin-left: 280px;
    max-width: calc(100% - 280px);
    overflow-y: auto;
    height: 100vh;
  }

  /* Mobile styles */
  @media (max-width: 768px) {
    .mobile-only {
      display: flex;
    }

    .docs-sidebar {
      position: fixed;
      transform: translateX(-100%);
    }

    .docs-main {
      margin-left: 0;
      max-width: 100%;
      padding: 80px 20px 40px;
    }

    .sidebar-header {
      padding-top: 80px;
    }
  }

  /* Desktop styles */
  @media (min-width: 769px) {
    .docs-sidebar {
      position: fixed;
      transform: translateX(0);
    }

    .sidebar-overlay {
      display: none;
    }
  }
</style>