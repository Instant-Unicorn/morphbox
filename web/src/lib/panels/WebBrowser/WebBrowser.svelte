<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { RefreshCw, ZoomIn, ChevronDown, ExternalLink, Home, ArrowLeft, ArrowRight, Settings2 } from 'lucide-svelte';
  
  let url = '';
  let iframeElement: HTMLIFrameElement;
  let loading = false;
  let zoomLevel = 1; // 1 = 100%, 0.5 = 50%, 0.25 = 25%
  let showZoomMenu = false;
  let hasDetectedServer = false;
  let detectedPort: number | null = null;
  let homeUrl = '';
  let showHomeUrlInput = false;
  let homeUrlInput = '';
  
  const zoomOptions = [
    { label: '25%', value: 0.25 },
    { label: '50%', value: 0.5 },
    { label: '100%', value: 1 }
  ];
  
  onMount(async () => {
    // Load saved home URL from localStorage
    const savedHomeUrl = localStorage.getItem('morphbox-web-browser-home');
    if (savedHomeUrl) {
      homeUrl = savedHomeUrl;
      homeUrlInput = savedHomeUrl;
    }
    
    // Try to detect if a local server is running
    await detectLocalServer();
  });
  
  async function detectLocalServer() {
    // Common development server ports to check (5173 is Vite default)
    const commonPorts = [5173, 3000, 5000, 8000, 8080, 4200, 3001, 5001, 8081];
    
    for (const port of commonPorts) {
      try {
        // Try to fetch from localhost with a short timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1000);
        
        const response = await fetch(`http://localhost:${port}`, {
          method: 'HEAD',
          mode: 'no-cors',
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        // If we get here without error, the port is likely active
        hasDetectedServer = true;
        detectedPort = port;
        url = `http://localhost:${port}`;
        console.log(`[WebBrowser] Detected local server on port ${port}`);
        break;
      } catch (e) {
        // Port not available or request failed, continue checking
      }
    }
    
    if (!hasDetectedServer) {
      console.log('[WebBrowser] No local development server detected');
    }
  }
  
  function navigate(targetUrl?: string) {
    if (targetUrl) {
      url = targetUrl;
    }
    
    if (!url) return;
    
    // Ensure URL has protocol
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'http://' + url;
    }
    
    loading = true;
    
    if (iframeElement) {
      iframeElement.src = url;
    }
  }
  
  function refresh() {
    if (iframeElement && iframeElement.src) {
      loading = true;
      iframeElement.src = iframeElement.src;
    }
  }
  
  function goBack() {
    if (iframeElement && iframeElement.contentWindow) {
      try {
        iframeElement.contentWindow.history.back();
      } catch (e) {
        console.warn('[WebBrowser] Cannot access iframe history:', e);
      }
    }
  }
  
  function goForward() {
    if (iframeElement && iframeElement.contentWindow) {
      try {
        iframeElement.contentWindow.history.forward();
      } catch (e) {
        console.warn('[WebBrowser] Cannot access iframe history:', e);
      }
    }
  }
  
  function goHome() {
    if (homeUrl) {
      navigate(homeUrl);
    } else if (hasDetectedServer && detectedPort) {
      navigate(`http://localhost:${detectedPort}`);
    } else {
      navigate('about:blank');
    }
  }
  
  function saveHomeUrl() {
    homeUrl = homeUrlInput;
    localStorage.setItem('morphbox-web-browser-home', homeUrl);
    showHomeUrlInput = false;
  }
  
  function cancelHomeUrl() {
    homeUrlInput = homeUrl;
    showHomeUrlInput = false;
  }
  
  function openExternal() {
    if (url) {
      window.open(url, '_blank');
    }
  }
  
  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      navigate();
    }
  }
  
  function setZoom(level: number) {
    zoomLevel = level;
    showZoomMenu = false;
  }
  
  function onIframeLoad() {
    loading = false;
    console.log('[WebBrowser] Iframe loaded');
    
    // Try to get the actual URL from the iframe
    try {
      if (iframeElement && iframeElement.contentWindow) {
        const iframeUrl = iframeElement.contentWindow.location.href;
        if (iframeUrl !== 'about:blank') {
          url = iframeUrl;
        }
      }
    } catch (e) {
      // Cross-origin restriction, can't access iframe URL
      console.log('[WebBrowser] Cannot access iframe URL due to cross-origin restrictions');
    }
  }
  
  function handleClickOutside(event: MouseEvent) {
    if (showZoomMenu && !(event.target as Element).closest('.zoom-menu-container')) {
      showZoomMenu = false;
    }
  }
  
  // Auto-navigate if we detected a server
  $: if (hasDetectedServer && detectedPort && iframeElement) {
    navigate();
  }
</script>

<svelte:window on:click={handleClickOutside} />

<div class="web-browser-container">
  <div class="browser-header">
    <div class="navigation-controls">
      <button 
        class="nav-button"
        on:click={goBack}
        title="Go back"
      >
        <ArrowLeft size={16} />
      </button>
      <button 
        class="nav-button"
        on:click={goForward}
        title="Go forward"
      >
        <ArrowRight size={16} />
      </button>
      <button 
        class="nav-button"
        on:click={refresh}
        title="Refresh"
        class:loading
      >
        <RefreshCw size={16} />
      </button>
      <button 
        class="nav-button"
        on:click={goHome}
        on:contextmenu|preventDefault={() => showHomeUrlInput = true}
        title="Go home (right-click to set)"
      >
        <Home size={16} />
      </button>
      <button 
        class="nav-button"
        on:click={() => showHomeUrlInput = true}
        title="Set home page"
      >
        <Settings2 size={16} />
      </button>
    </div>
    
    <div class="url-bar">
      <input
        type="text"
        bind:value={url}
        placeholder={hasDetectedServer ? `Local server detected on port ${detectedPort}` : "Enter URL..."}
        on:keydown={handleKeydown}
      />
    </div>
    
    <div class="browser-controls">
      <div class="zoom-menu-container">
        <button 
          class="control-button zoom-button"
          on:click={() => showZoomMenu = !showZoomMenu}
          title="Zoom level"
        >
          <ZoomIn size={16} />
          <span class="zoom-label">{Math.round(zoomLevel * 100)}%</span>
          <ChevronDown size={14} />
        </button>
        
        {#if showZoomMenu}
          <div class="zoom-menu">
            {#each zoomOptions as option}
              <button
                class="zoom-option"
                class:active={zoomLevel === option.value}
                on:click={() => setZoom(option.value)}
              >
                {option.label}
              </button>
            {/each}
          </div>
        {/if}
      </div>
      
      <button 
        class="control-button"
        on:click={openExternal}
        title="Open in new tab"
        disabled={!url}
      >
        <ExternalLink size={16} />
      </button>
    </div>
  </div>
  
  <div class="browser-content">
    {#if url}
      <div class="iframe-wrapper" style="transform: scale({zoomLevel}); transform-origin: top left; width: {100 / zoomLevel}%; height: {100 / zoomLevel}%;">
        <iframe
          bind:this={iframeElement}
          src={url}
          title="Web Browser Preview"
          on:load={onIframeLoad}
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
        />
      </div>
    {:else}
      <div class="empty-state">
        {#if hasDetectedServer}
          <p>Local development server detected on port {detectedPort}</p>
          <button class="primary-button" on:click={() => navigate()}>
            Open Local Server
          </button>
        {:else}
          <p>Enter a URL in the address bar to get started</p>
          <p class="hint">Tip: Start your local development server and it will be detected automatically</p>
        {/if}
      </div>
    {/if}
    
    {#if loading}
      <div class="loading-overlay">
        <div class="spinner" />
      </div>
    {/if}
  </div>
  
  {#if showHomeUrlInput}
    <div class="home-url-dialog">
      <div class="dialog-content">
        <h3>Set Home Page</h3>
        <input
          type="text"
          bind:value={homeUrlInput}
          placeholder="Enter home page URL (leave empty for default)"
          on:keydown={(e) => {
            if (e.key === 'Enter') saveHomeUrl();
            if (e.key === 'Escape') cancelHomeUrl();
          }}
        />
        <div class="dialog-actions">
          <button class="button button-secondary" on:click={cancelHomeUrl}>
            Cancel
          </button>
          <button class="button button-primary" on:click={saveHomeUrl}>
            Save
          </button>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .web-browser-container {
    display: flex;
    flex-direction: column;
    height: 100%;
    background-color: var(--bg-color, #2d2d30);
    color: var(--text-color, #cccccc);
  }
  
  .browser-header {
    display: flex;
    gap: 8px;
    padding: 8px;
    border-bottom: 1px solid var(--border-color, #3e3e42);
    background-color: var(--panel-bg, #252526);
  }
  
  .navigation-controls {
    display: flex;
    gap: 4px;
  }
  
  .nav-button {
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
  
  .nav-button:hover:not(:disabled) {
    background-color: rgba(255, 255, 255, 0.1);
  }
  
  .nav-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .nav-button.loading {
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  
  .url-bar {
    flex: 1;
    display: flex;
  }
  
  .url-bar input {
    width: 100%;
    background-color: var(--input-bg, #3c3c3c);
    color: var(--text-color, #cccccc);
    border: 1px solid var(--border-color, #3e3e42);
    border-radius: 4px;
    padding: 6px 12px;
    font-family: inherit;
    font-size: 14px;
  }
  
  .url-bar input:focus {
    outline: none;
    border-color: var(--accent-color, #007acc);
  }
  
  .browser-controls {
    display: flex;
    gap: 4px;
    align-items: center;
  }
  
  .control-button {
    background: none;
    border: 1px solid var(--border-color, #3e3e42);
    color: var(--text-color, #cccccc);
    padding: 6px 8px;
    border-radius: 4px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 4px;
    transition: all 0.2s;
    font-size: 13px;
  }
  
  .control-button:hover:not(:disabled) {
    background-color: rgba(255, 255, 255, 0.1);
  }
  
  .control-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .zoom-menu-container {
    position: relative;
  }
  
  .zoom-button {
    min-width: 80px;
  }
  
  .zoom-label {
    font-size: 12px;
  }
  
  .zoom-menu {
    position: absolute;
    top: 100%;
    right: 0;
    margin-top: 4px;
    background-color: var(--panel-bg, #252526);
    border: 1px solid var(--border-color, #3e3e42);
    border-radius: 4px;
    overflow: hidden;
    z-index: 100;
    min-width: 80px;
  }
  
  .zoom-option {
    display: block;
    width: 100%;
    background: none;
    border: none;
    color: var(--text-color, #cccccc);
    padding: 8px 16px;
    text-align: left;
    cursor: pointer;
    transition: background-color 0.2s;
    font-size: 13px;
  }
  
  .zoom-option:hover {
    background-color: rgba(255, 255, 255, 0.1);
  }
  
  .zoom-option.active {
    background-color: var(--accent-color, #007acc);
    color: white;
  }
  
  .browser-content {
    flex: 1;
    position: relative;
    overflow: auto;
    background-color: #e8e8e8;
  }
  
  .iframe-wrapper {
    position: absolute;
    top: 0;
    left: 0;
  }
  
  iframe {
    width: 100%;
    height: 100%;
    border: none;
    background-color: #e8e8e8;
  }
  
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    text-align: center;
    padding: 20px;
    background-color: var(--bg-color, #2d2d30);
  }
  
  .empty-state p {
    margin: 8px 0;
    color: var(--text-secondary, #858585);
  }
  
  .empty-state .hint {
    font-size: 13px;
    margin-top: 16px;
  }
  
  .primary-button {
    margin-top: 16px;
    background-color: var(--accent-color, #007acc);
    color: white;
    border: none;
    border-radius: 4px;
    padding: 8px 16px;
    font-size: 14px;
    cursor: pointer;
    transition: background-color 0.2s;
  }
  
  .primary-button:hover {
    background-color: #0086e6;
  }
  
  .loading-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.1);
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
  }
  
  .spinner {
    width: 32px;
    height: 32px;
    border: 3px solid rgba(0, 0, 0, 0.1);
    border-top-color: var(--accent-color, #007acc);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
  
  .home-url-dialog {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }
  
  .dialog-content {
    background-color: var(--bg-color, #2d2d30);
    border: 1px solid var(--border-color, #3e3e42);
    border-radius: 8px;
    padding: 24px;
    min-width: 400px;
    max-width: 90%;
  }
  
  .dialog-content h3 {
    margin: 0 0 16px 0;
    color: var(--panel-title-color, rgb(210, 210, 210));
    font-size: 18px;
  }
  
  .dialog-content input {
    width: 100%;
    background-color: var(--input-bg, #3c3c3c);
    color: var(--text-color, #cccccc);
    border: 1px solid var(--border-color, #3e3e42);
    border-radius: 4px;
    padding: 8px 12px;
    font-family: inherit;
    font-size: 14px;
    margin-bottom: 16px;
  }
  
  .dialog-content input:focus {
    outline: none;
    border-color: var(--accent-color, #007acc);
  }
  
  .dialog-actions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
  }
  
  .button {
    padding: 8px 16px;
    border-radius: 4px;
    border: none;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .button-secondary {
    background-color: transparent;
    color: var(--text-color, #cccccc);
    border: 1px solid var(--border-color, #3e3e42);
  }
  
  .button-secondary:hover {
    background-color: rgba(255, 255, 255, 0.1);
  }
  
  .button-primary {
    background-color: var(--accent-color, #007acc);
    color: white;
  }
  
  .button-primary:hover {
    background-color: #0086e6;
  }
</style>