<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  
  export let panelId: string;
  export let panelType: string = '';
  export let websocketUrl: string = '';
  export let data: any = {};
  let loading = true;
  let error = '';
  let containerElement: HTMLElement;
  let showSource = false;
  let panelSource = '';
  let iframeElement: HTMLIFrameElement;
  
  // Use panelType if provided, otherwise use panelId
  const actualPanelType = panelType || panelId;
  
  // Listen for messages from iframe
  const handleMessage = (event: MessageEvent) => {
    if (event.data && typeof event.data === 'object') {
      if (event.data.type === 'panel-script-start') {
        console.log('[CustomPanelRenderer] Panel script started:', event.data.panelId);
      } else if (event.data.type === 'panel-script-success') {
        console.log('[CustomPanelRenderer] Panel script executed successfully:', event.data.panelId);
      } else if (event.data.type === 'panel-script-error') {
        console.error('[CustomPanelRenderer] Panel script error:', event.data.panelId, event.data.error);
      }
    }
  };
  
  onMount(async () => {
    // Add message listener
    window.addEventListener('message', handleMessage);
    
    try {
      console.log('[CustomPanelRenderer] Loading panel:', {
        panelId,
        panelType,
        actualPanelType
      });
      
      // Check if this is an old panel ID format
      if (actualPanelType.startsWith('panel-') && actualPanelType.match(/panel-\d+-[a-z0-9]+/)) {
        throw new Error('This panel was created before the custom panels fix. Please close this panel and re-open it from the Panel Manager.');
      }
      
      // Load the panel source using the new code endpoint
      const response = await fetch(`/api/custom-panels/code/${actualPanelType}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[CustomPanelRenderer] Load failed:', response.status, errorText);
        
        if (response.status === 404) {
          throw new Error(`Custom panel file not found: ${actualPanelType}.svelte. Please ensure the panel exists in ~/morphbox/panels/`);
        }
        throw new Error(`Failed to load panel: ${response.status} ${errorText}`);
      }
      
      panelSource = await response.text();
      
      // Extract metadata
      const metadataMatch = panelSource.match(/<!--\s*@morphbox-panel\s*([\s\S]*?)-->/);
      const componentContent = metadataMatch ? panelSource.replace(metadataMatch[0], '').trim() : panelSource;
      
      // Extract script, style, and template parts
      const scriptMatch = componentContent.match(/<script(?:\s+lang="ts")?>([\s\S]*?)<\/script>/);
      const styleMatch = componentContent.match(/<style>([\s\S]*?)<\/style>/);
      
      // Extract template by removing script and style tags
      let template = componentContent;
      if (scriptMatch) {
        template = template.replace(scriptMatch[0], '');
      }
      if (styleMatch) {
        template = template.replace(styleMatch[0], '');
      }
      template = template.trim();
      
      const script = scriptMatch ? scriptMatch[1].trim() : '';
      const style = styleMatch ? styleMatch[1].trim() : '';
      
      if (!template) {
        template = '<div>No template defined</div>';
      }
      
      console.log('[CustomPanelRenderer] Extracted content:', {
        scriptLength: script.length,
        styleLength: style.length,
        templatePreview: template.substring(0, 200),
        hasScript: !!scriptMatch,
        hasStyle: !!styleMatch,
        hasTemplate: template.length > 0
      });
      
      // Check if this is a Svelte component (has Svelte syntax)
      const isSvelteComponent = template.includes('{#if') || template.includes('{#each') || template.includes('{$') || template.includes('{@') || (script.includes('import') && script.includes('from'));
      
      if (isSvelteComponent) {
        console.log('[CustomPanelRenderer] Detected Svelte syntax in panel');
        // For now, show a message that Svelte panels need to be converted
        const convertedTemplate = `
          <div style="padding: 20px; text-align: center;">
            <h3>Legacy Svelte Panel</h3>
            <p>This panel was created with Svelte syntax and needs to be converted to vanilla JavaScript.</p>
            <p style="color: var(--text-secondary);">Please recreate this panel to use the new vanilla JS format.</p>
            <div style="margin-top: 20px; padding: 10px; background: var(--bg-secondary); border-radius: 4px;">
              <strong>Panel: ${actualPanelType}</strong>
            </div>
          </div>
        `;
        createIframePanel('', convertedTemplate, style);
      } else {
        // Create an iframe to isolate the custom panel
        createIframePanel(script, template, style);
      }
      
      loading = false;
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load custom panel';
      console.error('[CustomPanelRenderer] Error:', err);
      loading = false;
    }
  });
  
  function createIframePanel(script: string, template: string, style: string) {
    console.log('[createIframePanel] Creating iframe with:', {
      scriptLength: script.length,
      templateLength: template.length,
      styleLength: style.length,
      scriptPreview: script.substring(0, 100),
      templatePreview: template.substring(0, 100)
    });
    
    // Process the script to handle exports and imports
    const processedScript = script
      .replace(/export\s+let\s+(\w+)[^;]*;?/g, 'let $1;')
      .replace(/import\s+.*?from\s+['"].*?['"];?/g, '// Import removed: $&');
    
    // Helper function to escape HTML entities in attributes
    function escapeHtml(str: string): string {
      return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }
    
    // Process template literals in the template
    const processedTemplate = template
      .replace(/\$\{panelId\}/g, panelId)
      .replace(/\$\{data\}/g, JSON.stringify(data))
      .replace(/\$\{websocketUrl\}/g, websocketUrl);
    
    // Escape the template to prevent script injection within the HTML
    // We need to be careful not to double-escape
    const escapedTemplate = processedTemplate
      .replace(/<\/script>/gi, '<\\/script>');
    
    // Build the HTML content as a string to avoid XMLSerializer entity encoding issues
    const iframeContent = `<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #1e1e1e;
      color: #d4d4d4;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      overflow: auto;
    }
    
    /* MorphBox theme variables */
    :root {
      --bg-primary: #1e1e1e;
      --bg-secondary: #252526;
      --bg-tertiary: #2d2d30;
      --panel-bg: #1e1e1e;
      --text-primary: #d4d4d4;
      --text-secondary: #858585;
      --border-color: #3e3e42;
      --accent-color: #0e639c;
      --error-color: #f48771;
      --success-color: #89d185;
      --warning-color: #cca700;
      --info-color: #75beff;
      --header-bg: #2d2d30;
      --input-bg: #3c3c3c;
      --info-bg: #264f78;
    }
    
    ${style}
  </style>
</head>
<body>
  <div id="app">${escapedTemplate}</div>
  <script>
    // Provide panel props
    const panelId = ${JSON.stringify(panelId)};
    const data = ${JSON.stringify(data)};
    const websocketUrl = ${JSON.stringify(websocketUrl)};
    
    // Simple reactive system
    const state = {};
    const listeners = new Map();
    
    function reactive(obj) {
      return new Proxy(obj, {
        set(target, prop, value) {
          target[prop] = value;
          if (listeners.has(prop)) {
            listeners.get(prop).forEach(fn => fn(value));
          }
          return true;
        }
      });
    }
    
    function onMount(fn) {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', fn);
      } else {
        setTimeout(fn, 0);
      }
    }
    
    // Add debug indicator
    const debugDiv = document.createElement('div');
    debugDiv.style.cssText = 'position: fixed; top: 0; right: 0; background: #0e639c; color: white; padding: 4px 8px; font-size: 10px; z-index: 9999;';
    debugDiv.textContent = 'Script Loading...';
    document.body.appendChild(debugDiv);
    
    // Execute user script
    try {
      console.log('[Panel Script] Starting execution for panel:', panelId);
      debugDiv.textContent = 'Script Running...';
      
      // Send message to parent for debugging
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({
          type: 'panel-script-start',
          panelId: panelId
        }, '*');
      }
      
      // Wrap user script in DOM ready check
      onMount(() => {
        ${processedScript}
      });
      
      console.log('[Panel Script] Script executed successfully');
      debugDiv.textContent = 'Script OK';
      debugDiv.style.background = '#89d185';
      
      // Send success message to parent
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({
          type: 'panel-script-success',
          panelId: panelId
        }, '*');
      }
      
      // Remove debug div after 2 seconds
      setTimeout(() => {
        if (debugDiv.parentNode) {
          debugDiv.parentNode.removeChild(debugDiv);
        }
      }, 2000);
    } catch (err) {
      console.error('[Panel Script] Error in custom panel script:', err);
      debugDiv.textContent = 'Script Error: ' + err.message;
      debugDiv.style.background = '#f48771';
      document.body.innerHTML = '<div style="padding: 20px; color: #f48771;">Error: ' + err.message + '</div>';
      
      // Send error message to parent
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({
          type: 'panel-script-error',
          panelId: panelId,
          error: err.message
        }, '*');
      }
    }
  <\/script>
</body>
</html>`;
    
    console.log('[createIframePanel] Generated HTML:', iframeContent.substring(0, 500) + '...');
    
    // Set iframe content using srcdoc which properly executes scripts
    const setIframeContent = () => {
      if (iframeElement) {
        console.log('[createIframePanel] Setting iframe srcdoc');
        iframeElement.srcdoc = iframeContent;
        
        iframeElement.onload = () => {
          console.log('[createIframePanel] Iframe loaded successfully');
        };
      } else {
        console.log('[createIframePanel] Iframe element not ready, retrying...');
        setTimeout(setIframeContent, 100);
      }
    };
    
    setIframeContent();
  }
  
  onDestroy(() => {
    // Cleanup message listener
    window.removeEventListener('message', handleMessage);
  });
</script>

<div class="custom-panel-wrapper">
  {#if loading}
    <div class="loading-container">
      <div class="loading-spinner"></div>
      <p>Loading custom panel...</p>
    </div>
  {:else if error}
    <div class="error-container">
      <h3>Error Loading Panel</h3>
      <p>{error}</p>
      <p class="hint">Check the browser console for more details.</p>
    </div>
  {:else}
    <iframe
      bind:this={iframeElement}
      class="panel-iframe"
      title="Custom Panel: {actualPanelType}"
      sandbox="allow-scripts"
    ></iframe>
  {/if}
  
  {#if !loading && !error && panelSource}
    <button 
      class="source-toggle"
      on:click={() => showSource = !showSource}
      title="Toggle source code"
    >
      {'</>'}
    </button>
    
    {#if showSource}
      <div class="source-overlay">
        <div class="source-header">
          <h3>Panel Source Code</h3>
          <button class="close-button" on:click={() => showSource = false}>×</button>
        </div>
        <pre class="source-code">{panelSource}</pre>
      </div>
    {/if}
  {/if}
</div>

<style>
  .custom-panel-wrapper {
    position: relative;
    height: 100%;
    width: 100%;
    overflow: hidden;
  }
  
  .loading-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    padding: 20px;
  }
  
  .loading-spinner {
    width: 32px;
    height: 32px;
    border: 3px solid var(--border-color, #3e3e42);
    border-top-color: var(--accent-color, #0e639c);
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 16px;
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  .error-container {
    padding: 20px;
    text-align: center;
    color: var(--text-primary, #d4d4d4);
  }
  
  .error-container h3 {
    color: var(--error-color, #f48771);
    margin: 0 0 12px 0;
  }
  
  .hint {
    color: var(--text-secondary, #858585);
    font-size: 14px;
    margin-top: 8px;
  }
  
  .panel-iframe {
    width: 100%;
    height: 100%;
    border: none;
    background-color: var(--panel-bg, #1e1e1e);
  }
  
  .source-toggle {
    position: absolute;
    top: 8px;
    right: 8px;
    background-color: var(--bg-secondary, #252526);
    border: 1px solid var(--border-color, #3e3e42);
    color: var(--text-secondary, #858585);
    padding: 4px 8px;
    border-radius: 4px;
    font-family: monospace;
    font-size: 12px;
    cursor: pointer;
    transition: all 0.2s;
    z-index: 10;
  }
  
  .source-toggle:hover {
    background-color: var(--bg-tertiary, #2d2d30);
    color: var(--text-primary, #cccccc);
  }
  
  .source-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: var(--bg-primary, #1e1e1e);
    z-index: 100;
    display: flex;
    flex-direction: column;
  }
  
  .source-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    background-color: var(--bg-secondary, #252526);
    border-bottom: 1px solid var(--border-color, #3e3e42);
  }
  
  .source-header h3 {
    margin: 0;
    font-size: 16px;
    color: var(--text-primary, #cccccc);
  }
  
  .close-button {
    background: none;
    border: none;
    color: var(--text-secondary, #858585);
    font-size: 24px;
    cursor: pointer;
    padding: 0;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    transition: all 0.2s;
  }
  
  .close-button:hover {
    background-color: var(--bg-tertiary, #2d2d30);
    color: var(--text-primary, #cccccc);
  }
  
  .source-code {
    flex: 1;
    margin: 0;
    padding: 16px;
    background-color: var(--bg-secondary, #252526);
    color: var(--text-primary, #d4d4d4);
    font-family: monospace;
    font-size: 13px;
    line-height: 1.5;
    overflow: auto;
    white-space: pre-wrap;
    word-break: break-word;
  }
</style>