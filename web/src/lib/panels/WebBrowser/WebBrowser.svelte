<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { RefreshCw, ZoomIn, ChevronDown, ExternalLink, Home, ArrowLeft, ArrowRight, Settings2 } from 'lucide-svelte';
  
  let url = '';
  let iframeElement: HTMLIFrameElement;
  let loading = false;
  let zoomLevel = 1; // 1 = 100%, 0.5 = 50%, 0.25 = 25%
  let showZoomMenu = false;
  let portInput = '3000';
  let showWarning = false;
  
  const zoomOptions = [
    { label: '25%', value: 0.25 },
    { label: '50%', value: 0.5 },
    { label: '100%', value: 1 }
  ];
  
  onMount(async () => {
    // Show warning about limitations
    showWarning = true;
    setTimeout(() => {
      showWarning = false;
    }, 5000);
  });
  
  function navigate(targetUrl?: string) {
    if (targetUrl) {
      url = targetUrl;
    }
    
    if (!url && portInput) {
      // If no URL but port is provided, use localhost with that port
      url = `http://localhost:${portInput}`;
    }
    
    if (!url) return;
    
    // Only allow localhost URLs
    try {
      const urlObj = new URL(url);
      if (urlObj.hostname !== 'localhost' && urlObj.hostname !== '127.0.0.1') {
        alert('Only localhost URLs are supported. External URLs cannot be loaded due to security restrictions.');
        return;
      }
    } catch (e) {
      // If URL parsing fails, assume it's a port number
      if (/^\d+$/.test(url)) {
        url = `http://localhost:${url}`;
      } else {
        alert('Please enter a valid localhost URL or port number');
        return;
      }
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
    url = '';
    if (iframeElement) {
      iframeElement.src = 'about:blank';
    }
  }
  
  function navigateToPort() {
    if (portInput) {
      navigate(`http://localhost:${portInput}`);
    }
  }
  
  function openExternal() {
    if (url) {
      window.open(url, '_blank');
    }
  }
  
  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      navigateToPort();
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
        title="Clear"
      >
        <Home size={16} />
      </button>
    </div>
    
    <div class="url-bar">
      <span class="url-prefix">http://localhost:</span>
      <input
        type="text"
        bind:value={portInput}
        placeholder="3000"
        on:keydown={handleKeydown}
        class="port-input"
      />
      <button class="go-button" on:click={() => navigate()}>
        Go
      </button>
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
        <p>🌐 Local Browser (Container Services Only)</p>
        <p class="hint">This panel can only access services running inside the container on localhost.</p>
        <p class="hint">Enter a port number above (e.g., 3000, 8080) to connect to a local service.</p>
        <div class="common-ports">
          <p>Common ports:</p>
          <button class="port-button" on:click={() => { portInput = '3000'; navigateToPort(); }}>3000</button>
          <button class="port-button" on:click={() => { portInput = '5173'; navigateToPort(); }}>5173</button>
          <button class="port-button" on:click={() => { portInput = '8000'; navigateToPort(); }}>8000</button>
          <button class="port-button" on:click={() => { portInput = '8080'; navigateToPort(); }}>8080</button>
        </div>
      </div>
    {/if}
    
    {#if loading}
      <div class="loading-overlay">
        <div class="spinner" />
      </div>
    {/if}
  </div>
  
  {#if showWarning}
    <div class="warning-banner">
      ⚠️ Note: This browser can only access services running inside the container on localhost. External URLs are not supported.
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
    align-items: center;
    gap: 4px;
  }
  
  .url-prefix {
    color: var(--text-secondary, #858585);
    font-size: 14px;
    padding: 0 8px;
  }
  
  .port-input {
    width: 100px;
    background-color: var(--input-bg, #3c3c3c);
    color: var(--text-color, #cccccc);
    border: 1px solid var(--border-color, #3e3e42);
    border-radius: 4px;
    padding: 6px 12px;
    font-family: inherit;
    font-size: 14px;
  }
  
  .port-input:focus {
    outline: none;
    border-color: var(--accent-color, #007acc);
  }
  
  .go-button {
    background-color: var(--accent-color, #007acc);
    color: white;
    border: none;
    border-radius: 4px;
    padding: 6px 16px;
    font-size: 14px;
    cursor: pointer;
    transition: background-color 0.2s;
  }
  
  .go-button:hover {
    background-color: #0086e6;
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
  
  .warning-banner {
    position: absolute;
    top: 50px;
    left: 50%;
    transform: translateX(-50%);
    background-color: rgba(255, 193, 7, 0.9);
    color: #333;
    padding: 10px 20px;
    border-radius: 4px;
    font-size: 13px;
    z-index: 100;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    animation: slideDown 0.3s ease-out;
  }
  
  @keyframes slideDown {
    from {
      transform: translateX(-50%) translateY(-20px);
      opacity: 0;
    }
    to {
      transform: translateX(-50%) translateY(0);
      opacity: 1;
    }
  }
  
  .common-ports {
    margin-top: 24px;
  }
  
  .common-ports p {
    margin-bottom: 12px;
    font-size: 14px;
    color: var(--text-color, #cccccc);
  }
  
  .port-button {
    background-color: var(--button-bg, #3c3c3c);
    color: var(--text-color, #cccccc);
    border: 1px solid var(--border-color, #3e3e42);
    border-radius: 4px;
    padding: 8px 16px;
    margin: 0 4px;
    cursor: pointer;
    transition: all 0.2s;
    font-size: 14px;
  }
  
  .port-button:hover {
    background-color: var(--accent-color, #007acc);
    color: white;
    border-color: var(--accent-color, #007acc);
  }
</style>