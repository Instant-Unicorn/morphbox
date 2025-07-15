<script lang="ts">
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import type { PageData } from './$types';
  
  export let data: PageData;
  
  let tocVisible = false;
  let contentContainer: HTMLElement;
  
  onMount(() => {
    // Add IDs to headers for anchor links
    if (contentContainer) {
      const headers = contentContainer.querySelectorAll('h1, h2, h3, h4, h5, h6');
      headers.forEach((header, index) => {
        const text = header.textContent || '';
        const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        header.id = id;
        
        // Add anchor link
        const anchor = document.createElement('a');
        anchor.href = `#${id}`;
        anchor.className = 'header-anchor';
        anchor.textContent = '#';
        anchor.setAttribute('aria-label', `Link to ${text}`);
        header.appendChild(anchor);
      });
    }
    
    // Handle hash navigation
    if (window.location.hash) {
      setTimeout(() => {
        const element = document.getElementById(window.location.hash.slice(1));
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    }
  });
  
  function toggleToc() {
    tocVisible = !tocVisible;
  }
  
  function navigateToSection(id: string) {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      // Update URL without triggering navigation
      history.replaceState(null, '', `#${id}`);
    }
    // Close TOC on mobile after navigation
    if (window.innerWidth < 768) {
      tocVisible = false;
    }
  }
  
  // Generate breadcrumbs from slug
  $: breadcrumbs = data.slug ? data.slug.split('/').map((segment, index, array) => ({
    title: segment.replace(/-/g, ' '),
    href: '/docs/' + array.slice(0, index + 1).join('/'),
    isLast: index === array.length - 1
  })) : [];
</script>

<svelte:head>
  <title>{data.title} - MorphBox Documentation</title>
  <meta name="description" content={data.description} />
</svelte:head>

<div class="doc-page">
  <!-- Breadcrumbs -->
  {#if breadcrumbs.length > 0}
    <nav class="breadcrumbs" aria-label="Breadcrumb">
      <a href="/docs">Documentation</a>
      {#each breadcrumbs as crumb}
        <span class="breadcrumb-separator">→</span>
        {#if crumb.isLast}
          <span class="breadcrumb-current">{crumb.title}</span>
        {:else}
          <a href={crumb.href}>{crumb.title}</a>
        {/if}
      {/each}
    </nav>
  {/if}
  
  <!-- Page Header -->
  <header class="doc-header">
    <div class="doc-header-content">
      <h1>{data.title}</h1>
      {#if data.description}
        <p class="doc-description">{data.description}</p>
      {/if}
      {#if data.isPlaceholder}
        <div class="placeholder-notice">
          <strong>📝 Documentation in Progress</strong>
          <p>This page is a placeholder. Complete documentation is coming soon!</p>
        </div>
      {/if}
    </div>
    
    <!-- Table of Contents Toggle (Mobile) -->
    {#if data.tableOfContents.length > 0}
      <button class="toc-toggle mobile-only" on:click={toggleToc} aria-label="Toggle table of contents">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M3 9h14V7H3v2zm0 4h14v-2H3v2zm0 4h14v-2H3v2zm16 0h2v-2h-2v2zm0-10v2h2V7h-2zm0 6h2v-2h-2v2z"/>
        </svg>
        Contents
      </button>
    {/if}
  </header>
  
  <div class="doc-body">
    <!-- Table of Contents (Desktop Sidebar) -->
    {#if data.tableOfContents.length > 0}
      <aside class="doc-toc desktop-only">
        <h3>On this page</h3>
        <nav class="toc-nav">
          {#each data.tableOfContents as item}
            <button 
              class="toc-item level-{item.level}"
              on:click={() => navigateToSection(item.id)}
            >
              {item.title}
            </button>
          {/each}
        </nav>
      </aside>
    {/if}
    
    <!-- Mobile TOC Overlay -->
    {#if tocVisible && data.tableOfContents.length > 0}
      <div class="toc-overlay mobile-only">
        <div class="toc-modal">
          <div class="toc-modal-header">
            <h3>On this page</h3>
            <button class="toc-close" on:click={toggleToc} aria-label="Close table of contents">×</button>
          </div>
          <nav class="toc-nav">
            {#each data.tableOfContents as item}
              <button 
                class="toc-item level-{item.level}"
                on:click={() => navigateToSection(item.id)}
              >
                {item.title}
              </button>
            {/each}
          </nav>
        </div>
      </div>
    {/if}
    
    <!-- Main Content -->
    <main class="doc-content">
      <article class="markdown-content" bind:this={contentContainer}>
        {@html data.content}
      </article>
      
      <!-- Page Footer -->
      <footer class="doc-footer">
        <div class="doc-meta">
          <p>Last updated: {new Date(data.lastModified).toLocaleDateString()}</p>
          {#if !data.isPlaceholder}
            <p>
              <a href="https://github.com/morphbox/morphbox/edit/main/web/src/content/docs/{data.slug}.md" target="_blank" rel="noopener">
                Edit this page on GitHub
              </a>
            </p>
          {/if}
        </div>
        
        <div class="doc-navigation">
          <!-- We'll add previous/next navigation here later -->
        </div>
      </footer>
    </main>
  </div>
</div>

<style>
  .doc-page {
    max-width: 1400px;
    margin: 0 auto;
  }
  
  /* Breadcrumbs */
  .breadcrumbs {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 24px;
    font-size: 14px;
    color: var(--text-tertiary, #858585);
  }
  
  .breadcrumbs a {
    color: var(--text-tertiary, #858585);
    text-decoration: none;
    text-transform: capitalize;
  }
  
  .breadcrumbs a:hover {
    color: var(--accent-color, #4ec9b0);
  }
  
  .breadcrumb-separator {
    color: var(--text-tertiary, #858585);
  }
  
  .breadcrumb-current {
    color: var(--text-primary, #d4d4d4);
    text-transform: capitalize;
  }
  
  /* Page Header */
  .doc-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 40px;
    padding-bottom: 24px;
    border-bottom: 1px solid var(--border-color, #3e3e42);
  }
  
  .doc-header-content {
    flex: 1;
  }
  
  .doc-header h1 {
    font-size: 2.5rem;
    font-weight: 700;
    margin: 0 0 12px 0;
    color: var(--text-primary, #d4d4d4);
  }
  
  .doc-description {
    font-size: 1.125rem;
    color: var(--text-secondary, #cccccc);
    margin: 0;
    line-height: 1.5;
  }
  
  .placeholder-notice {
    margin-top: 16px;
    padding: 16px;
    background-color: var(--bg-warning, #2d2a1f);
    border: 1px solid var(--border-warning, #6b5b1f);
    border-radius: 6px;
  }
  
  .placeholder-notice strong {
    display: block;
    color: var(--text-warning, #f9cc33);
    margin-bottom: 4px;
  }
  
  .placeholder-notice p {
    margin: 0;
    color: var(--text-secondary, #cccccc);
    font-size: 14px;
  }
  
  .toc-toggle {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    background-color: var(--bg-secondary, #252526);
    border: 1px solid var(--border-color, #3e3e42);
    border-radius: 6px;
    color: var(--text-primary, #d4d4d4);
    cursor: pointer;
    font-size: 14px;
  }
  
  .toc-toggle:hover {
    background-color: var(--bg-hover, #2d2d30);
  }
  
  /* Doc Body */
  .doc-body {
    display: grid;
    grid-template-columns: 1fr 240px;
    gap: 40px;
    align-items: start;
  }
  
  /* Table of Contents */
  .doc-toc {
    position: sticky;
    top: 40px;
    background-color: var(--bg-secondary, #252526);
    border: 1px solid var(--border-color, #3e3e42);
    border-radius: 8px;
    padding: 20px;
    max-height: calc(100vh - 120px);
    overflow-y: auto;
  }
  
  .doc-toc h3 {
    font-size: 14px;
    font-weight: 600;
    margin: 0 0 16px 0;
    color: var(--text-secondary, #cccccc);
  }
  
  .toc-nav {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  
  .toc-item {
    display: block;
    width: 100%;
    text-align: left;
    padding: 6px 0;
    background: none;
    border: none;
    color: var(--text-tertiary, #858585);
    font-size: 13px;
    cursor: pointer;
    line-height: 1.4;
    transition: color 0.2s;
  }
  
  .toc-item:hover {
    color: var(--text-primary, #d4d4d4);
  }
  
  .toc-item.level-1 {
    font-weight: 500;
    color: var(--text-secondary, #cccccc);
  }
  
  .toc-item.level-2 {
    padding-left: 12px;
  }
  
  .toc-item.level-3 {
    padding-left: 24px;
  }
  
  .toc-item.level-4 {
    padding-left: 36px;
  }
  
  /* Mobile TOC */
  .toc-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.7);
    z-index: 300;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
  }
  
  .toc-modal {
    background-color: var(--bg-secondary, #252526);
    border: 1px solid var(--border-color, #3e3e42);
    border-radius: 8px;
    max-width: 400px;
    width: 100%;
    max-height: 80vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }
  
  .toc-modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 20px;
    border-bottom: 1px solid var(--border-color, #3e3e42);
  }
  
  .toc-modal-header h3 {
    margin: 0;
    font-size: 16px;
    color: var(--text-primary, #d4d4d4);
  }
  
  .toc-close {
    background: none;
    border: none;
    color: var(--text-tertiary, #858585);
    cursor: pointer;
    font-size: 24px;
    padding: 0;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
  }
  
  .toc-close:hover {
    background-color: var(--bg-hover, #2d2d30);
    color: var(--text-primary, #d4d4d4);
  }
  
  .toc-modal .toc-nav {
    padding: 20px;
    overflow-y: auto;
  }
  
  /* Main Content */
  .doc-content {
    min-width: 0; /* Prevent flex item from growing beyond container */
  }
  
  .markdown-content {
    line-height: 1.6;
    color: var(--text-primary, #d4d4d4);
  }
  
  /* Markdown Styles */
  .markdown-content :global(h1),
  .markdown-content :global(h2),
  .markdown-content :global(h3),
  .markdown-content :global(h4),
  .markdown-content :global(h5),
  .markdown-content :global(h6) {
    margin: 32px 0 16px 0;
    font-weight: 600;
    color: var(--text-primary, #d4d4d4);
    position: relative;
  }
  
  .markdown-content :global(h1) {
    font-size: 2rem;
    border-bottom: 1px solid var(--border-color, #3e3e42);
    padding-bottom: 8px;
  }
  
  .markdown-content :global(h2) {
    font-size: 1.5rem;
  }
  
  .markdown-content :global(h3) {
    font-size: 1.25rem;
  }
  
  .markdown-content :global(h4) {
    font-size: 1.125rem;
  }
  
  .markdown-content :global(.header-anchor) {
    position: absolute;
    left: -24px;
    color: var(--text-tertiary, #858585);
    text-decoration: none;
    opacity: 0;
    transition: opacity 0.2s;
  }
  
  .markdown-content :global(h1:hover .header-anchor),
  .markdown-content :global(h2:hover .header-anchor),
  .markdown-content :global(h3:hover .header-anchor),
  .markdown-content :global(h4:hover .header-anchor),
  .markdown-content :global(h5:hover .header-anchor),
  .markdown-content :global(h6:hover .header-anchor) {
    opacity: 1;
  }
  
  .markdown-content :global(p) {
    margin: 16px 0;
  }
  
  .markdown-content :global(ul),
  .markdown-content :global(ol) {
    margin: 16px 0;
    padding-left: 32px;
  }
  
  .markdown-content :global(li) {
    margin: 4px 0;
  }
  
  .markdown-content :global(code) {
    background-color: var(--bg-code, #2d2d30);
    color: var(--text-code, #f8f8f2);
    padding: 2px 6px;
    border-radius: 4px;
    font-family: 'Monaco', 'Cascadia Code', 'Fira Code', monospace;
    font-size: 0.9em;
  }
  
  .markdown-content :global(pre) {
    background-color: var(--bg-code, #2d2d30);
    color: var(--text-code, #f8f8f2);
    padding: 16px;
    border-radius: 8px;
    overflow-x: auto;
    margin: 16px 0;
    font-family: 'Monaco', 'Cascadia Code', 'Fira Code', monospace;
    font-size: 0.9em;
    line-height: 1.5;
  }
  
  .markdown-content :global(pre code) {
    background: none;
    padding: 0;
  }
  
  .markdown-content :global(a) {
    color: var(--accent-color, #4ec9b0);
    text-decoration: none;
  }
  
  .markdown-content :global(a:hover) {
    text-decoration: underline;
  }
  
  .markdown-content :global(blockquote) {
    border-left: 4px solid var(--accent-color, #4ec9b0);
    padding-left: 16px;
    margin: 16px 0;
    color: var(--text-secondary, #cccccc);
    font-style: italic;
  }
  
  .markdown-content :global(table) {
    width: 100%;
    border-collapse: collapse;
    margin: 16px 0;
  }
  
  .markdown-content :global(th),
  .markdown-content :global(td) {
    border: 1px solid var(--border-color, #3e3e42);
    padding: 8px 12px;
    text-align: left;
  }
  
  .markdown-content :global(th) {
    background-color: var(--bg-secondary, #252526);
    font-weight: 600;
  }
  
  /* Doc Footer */
  .doc-footer {
    margin-top: 80px;
    padding-top: 32px;
    border-top: 1px solid var(--border-color, #3e3e42);
  }
  
  .doc-meta {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 14px;
    color: var(--text-tertiary, #858585);
  }
  
  .doc-meta a {
    color: var(--accent-color, #4ec9b0);
    text-decoration: none;
  }
  
  .doc-meta a:hover {
    text-decoration: underline;
  }
  
  /* Responsive */
  .mobile-only {
    display: none;
  }
  
  .desktop-only {
    display: block;
  }
  
  @media (max-width: 1024px) {
    .doc-body {
      grid-template-columns: 1fr;
      gap: 24px;
    }
    
    .desktop-only {
      display: none;
    }
    
    .mobile-only {
      display: block;
    }
    
    .toc-toggle.mobile-only {
      display: flex;
    }
  }
  
  @media (max-width: 768px) {
    .doc-header {
      flex-direction: column;
      gap: 16px;
    }
    
    .doc-header h1 {
      font-size: 2rem;
    }
    
    .doc-meta {
      flex-direction: column;
      gap: 8px;
      align-items: flex-start;
    }
    
    .markdown-content :global(.header-anchor) {
      display: none;
    }
  }
</style>