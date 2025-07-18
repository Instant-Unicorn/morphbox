<script lang="ts">
  import { onMount, onDestroy, createEventDispatcher } from 'svelte';
  import { browser } from '$app/environment';
  import { settings } from '$lib/panels/Settings/settings-store';
  import { fade } from 'svelte/transition';
  
  let Terminal: any;
  let FitAddon: any;
  let WebLinksAddon: any;
  
  // Only import xterm in the browser
  if (browser) {
    import('xterm').then(module => {
      Terminal = module.Terminal;
    });
    import('xterm-addon-fit').then(module => {
      FitAddon = module.FitAddon;
    });
    import('xterm-addon-web-links').then(module => {
      WebLinksAddon = module.WebLinksAddon;
    });
    import('xterm/css/xterm.css');
  }

  export let websocketUrl = 'ws://localhost:3000';
  export let autoLaunchClaude = false;
  
  let terminalContainer: HTMLDivElement;
  let terminal: Terminal;
  let fitAddon: FitAddon;
  let ws: WebSocket | null = null;
  let inputBuffer = '';
  let settingsUnsubscribe: (() => void) | null = null;
  let reconnectAttempts = 0;
  let isReconnecting = false;
  let connectionStatus: 'connected' | 'disconnected' | 'reconnecting' = 'disconnected';
  let terminalSessionId: string | null = null;
  let isInitializing = true;
  let hideLogoTimeout: number | null = null;
  
  const dispatch = createEventDispatcher();
  
  // Output buffering for performance
  let outputBuffer: string[] = [];
  let flushTimeout: number | null = null;
  const BUFFER_FLUSH_DELAY = 16; // ~60fps
  
  function flushBuffer() {
    if (outputBuffer.length > 0 && terminal) {
      const data = outputBuffer.join('');
      outputBuffer = [];
      terminal.write(data);
    }
    flushTimeout = null;
  }
  
  function scheduleFlush() {
    if (!flushTimeout && browser) {
      flushTimeout = window.requestAnimationFrame(flushBuffer);
    }
  }
  
  export function write(data: string) {
    if (terminal) {
      // For small amounts of data or when viewport is small, write immediately
      const viewport = getViewportInfo();
      if (data.length < 100 || viewport.isSmall) {
        terminal.write(data);
      } else {
        // Buffer larger outputs for performance
        outputBuffer.push(data);
        scheduleFlush();
      }
    }
  }
  
  export function writeln(data: string) {
    if (terminal) {
      write(data + '\r\n');
    }
  }
  
  export function clear() {
    if (terminal) {
      outputBuffer = []; // Clear any pending output
      if (flushTimeout) {
        cancelAnimationFrame(flushTimeout);
        flushTimeout = null;
      }
      terminal.clear();
    }
  }
  
  export function clearSession() {
    terminalSessionId = null;
    if (browser) {
      sessionStorage.removeItem('morphbox-terminal-session');
    }
    writeln('\r\n🔄 Session cleared. Next connection will start fresh.');
  }
  
  function reconnectWithBackoff() {
    const maxDelay = 30000; // Max 30 seconds
    const baseDelay = 1000; // Start with 1 second
    const delay = Math.min(baseDelay * Math.pow(2, reconnectAttempts), maxDelay);
    
    writeln(`\r\nReconnecting in ${delay / 1000} seconds... (attempt ${reconnectAttempts + 1})`);
    
    setTimeout(() => {
      if (!ws || ws.readyState === WebSocket.CLOSED) {
        reconnectAttempts++;
        connectWebSocket();
      }
    }, delay);
  }
  
  function connectWebSocket() {
    if (ws) {
      ws.close();
    }
    
    // Include terminal session ID and autoLaunchClaude flag
    let url = websocketUrl;
    if (browser) {
      const urlObj = new URL(websocketUrl);
      if (terminalSessionId) {
        urlObj.searchParams.set('terminalSessionId', terminalSessionId);
      }
      urlObj.searchParams.set('autoLaunchClaude', autoLaunchClaude.toString());
      url = urlObj.toString();
    }
    
    console.log('[Terminal] Connecting to WebSocket:', url);
    console.log('[Terminal] User agent:', navigator.userAgent);
    console.log('[Terminal] Is mobile:', getViewportInfo().isTouchDevice);
    
    try {
      ws = new WebSocket(url);
    } catch (error) {
      console.error('[Terminal] WebSocket creation error:', error);
      isInitializing = false;
      return;
    }
    
    // Set timeout for connection
    const connectionTimeout = setTimeout(() => {
      if (ws.readyState !== WebSocket.OPEN) {
        writeln('\r\n❌ WebSocket connection timeout. Please check if the WebSocket server is running on port 8009.');
        console.error('WebSocket connection timeout');
      }
    }, 5000);
    
    ws.onopen = () => {
      clearTimeout(connectionTimeout);
      console.log('WebSocket connected');
      connectionStatus = 'connected';
      reconnectAttempts = 0;
      isReconnecting = false;
      // Don't immediately hide - wait for agent launch or output
      
      if (terminalSessionId) {
        writeln('\r\n🔄 Reconnecting to existing session...');
      } else {
        writeln('\r\n✅ Connected to server');
      }
      
      dispatch('connection', { connected: true });
      
      // Hide splash screen after connection
      setTimeout(() => {
        console.log('[Terminal] Hiding loading overlay after connection');
        isInitializing = false;
      }, 750);
    };
    
    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log('Received message:', message.type);
        
        switch (message.type) {
          case 'CONNECTED':
            writeln(`\r\n${message.payload?.message || 'Connected'}`);
            break;
          case 'SESSION_CREATED':
            dispatch('session', { sessionId: message.payload?.sessionId });
            break;
          case 'AGENT_LAUNCHED':
            // Delay hiding the logo
            if (hideLogoTimeout) clearTimeout(hideLogoTimeout);
            hideLogoTimeout = setTimeout(() => {
              isInitializing = false;
            }, 750);
            dispatch('agent', { 
              status: 'Active', 
              agentId: message.payload?.agentId 
            });
            break;
          case 'TERMINAL_SESSION_ID':
            if (message.payload?.sessionId) {
              const isNewSession = terminalSessionId !== message.payload.sessionId;
              terminalSessionId = message.payload.sessionId;
              // Store in sessionStorage for persistence
              if (browser) {
                sessionStorage.setItem('morphbox-terminal-session', terminalSessionId);
              }
              if (isNewSession) {
                writeln(`\r\n✨ New session created: ${terminalSessionId.substring(0, 8)}...`);
              } else {
                writeln(`\r\n✅ Session restored: ${terminalSessionId.substring(0, 8)}...`);
              }
            }
            break;
          case 'AGENT_EXIT':
            dispatch('agent', { status: 'No agent' });
            break;
          case 'OUTPUT':
            if (message.payload?.data) {
              // Delay hiding the logo on first output
              if (isInitializing) {
                if (hideLogoTimeout) clearTimeout(hideLogoTimeout);
                hideLogoTimeout = setTimeout(() => {
                  isInitializing = false;
                }, 750);
              }
              write(message.payload.data);
            }
            break;
          case 'ERROR':
            writeln(`\r\nError: ${message.payload?.message || 'Unknown error'}`);
            break;
          case 'STATE_UPDATE':
            // Handle state updates if needed
            if (message.payload?.agent) {
              dispatch('agent', { 
                status: message.payload.agent.status || 'Active',
                agentId: message.payload.agent.id
              });
            }
            break;
          case 'CLEAR':
            clear();
            break;
          default:
            console.log('Unknown message type:', message.type);
        }
      } catch (e) {
        console.error('Error parsing WebSocket message:', e);
        // If it's not JSON, just write it as-is
        write(event.data);
      }
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      writeln(`\r\nWebSocket error: ${error}`);
    };
    
    ws.onclose = (event) => {
      console.log('WebSocket closed:', event.code, event.reason);
      connectionStatus = 'disconnected';
      writeln(`\r\nDisconnected from server (code: ${event.code})`);
      dispatch('connection', { connected: false });
      dispatch('agent', { status: 'No agent' });
      
      // Only reconnect if it wasn't a normal closure and we're not already reconnecting
      if (event.code !== 1000 && event.code !== 1001 && !isReconnecting) {
        isReconnecting = true;
        connectionStatus = 'reconnecting';
        reconnectWithBackoff();
      }
    };
  }
  
  // Detect viewport size and characteristics
  function getViewportInfo() {
    if (!browser) return { width: 1200, height: 800, isSmall: false, isTouchDevice: false };
    
    const width = window.innerWidth;
    const height = window.innerHeight;
    const isSmall = width < 768;
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    
    return { width, height, isSmall, isTouchDevice };
  }
  
  // Calculate appropriate font size and dimensions based on viewport and container
  function getTerminalOptions() {
    const viewport = getViewportInfo();
    const currentSettings = $settings;
    
    // Dynamic font sizing based on viewport
    let fontSize = currentSettings?.terminal.fontSize || 14;
    if (viewport.isSmall) {
      // Ensure minimum readable font size on small screens
      fontSize = Math.max(14, Math.min(fontSize, 16));
    }
    
    // Get container dimensions if available
    let containerWidth = viewport.width;
    let containerHeight = viewport.height;
    if (terminalContainer) {
      const rect = terminalContainer.getBoundingClientRect();
      containerWidth = rect.width || containerWidth;
      containerHeight = rect.height || containerHeight;
    }
    
    // Calculate columns and rows based on actual container size
    const charWidth = fontSize * 0.6; // Approximate character width
    const lineHeight = fontSize * (currentSettings?.terminal.lineHeight || 1.2);
    const padding = viewport.isSmall ? 10 : 20;
    
    const cols = Math.max(40, Math.floor((containerWidth - padding * 2) / charWidth));
    const rows = Math.max(10, Math.floor((containerHeight - padding * 2) / lineHeight));
    
    return {
      fontSize,
      fontFamily: currentSettings?.terminal.fontFamily || '"Cascadia Code", "Fira Code", monospace',
      cols,
      rows,
      lineHeight: currentSettings?.terminal.lineHeight || 1.2,
      cursorStyle: currentSettings?.terminal.cursorStyle || 'block',
      cursorBlink: currentSettings?.terminal.cursorBlink ?? true,
      allowProposedApi: true,
      scrollback: viewport.isSmall ? 1000 : 5000, // Reduce scrollback on mobile for performance
      fastScrollModifier: 'ctrl',
      smoothScrollDuration: viewport.isSmall ? 0 : 125 // Disable smooth scroll on mobile
    };
  }
  
  // Update terminal options when settings change
  export function updateTerminalSettings() {
    if (terminal && browser) {
      const currentSettings = $settings;
      terminal.options.fontSize = currentSettings.terminal.fontSize;
      terminal.options.fontFamily = currentSettings.terminal.fontFamily;
      terminal.options.lineHeight = currentSettings.terminal.lineHeight;
      terminal.options.cursorStyle = currentSettings.terminal.cursorStyle;
      terminal.options.cursorBlink = currentSettings.terminal.cursorBlink;
      
      // Update theme based on settings
      if (currentSettings.theme === 'light') {
        terminal.options.theme = {
          background: '#ffffff',
          foreground: '#333333',
          cursor: '#333333',
          cursorAccent: '#ffffff',
          selectionBackground: '#add6ff',
          black: '#000000',
          red: '#cd3131',
          green: '#00bc00',
          yellow: '#949800',
          blue: '#0451a5',
          magenta: '#bc05bc',
          cyan: '#0598bc',
          white: '#555753',
          brightBlack: '#555753',
          brightRed: '#cd3131',
          brightGreen: '#14ce14',
          brightYellow: '#b5ba00',
          brightBlue: '#0451a5',
          brightMagenta: '#bc05bc',
          brightCyan: '#0598bc',
          brightWhite: '#a5a5a5'
        };
      } else if (currentSettings.theme === 'custom' && currentSettings.customTheme) {
        // Apply custom theme colors
        terminal.options.theme = {
          ...terminal.options.theme,
          background: currentSettings.customTheme.background,
          foreground: currentSettings.customTheme.foreground,
          cursor: currentSettings.customTheme.foreground,
          cursorAccent: currentSettings.customTheme.background,
          selectionBackground: currentSettings.customTheme.accent
        };
      } else {
        // Default dark theme
        terminal.options.theme = {
          background: '#1e1e1e',
          foreground: '#d4d4d4',
          cursor: '#d4d4d4',
          cursorAccent: '#1e1e1e',
          selectionBackground: '#264f78',
          black: '#000000',
          red: '#cd3131',
          green: '#0dbc79',
          yellow: '#e5e510',
          blue: '#2472c8',
          magenta: '#bc3fbc',
          cyan: '#11a8cd',
          white: '#e5e5e5',
          brightBlack: '#666666',
          brightRed: '#f14c4c',
          brightGreen: '#23d18b',
          brightYellow: '#f5f543',
          brightBlue: '#3b8eea',
          brightMagenta: '#d670d6',
          brightCyan: '#29b8db',
          brightWhite: '#e5e5e5'
        };
      }
      
      if (fitAddon) {
        fitAddon.fit();
      }
    }
  }
  
  onMount(async () => {
    if (!browser) return;
    
    console.log('[Terminal] Starting initialization...');
    
    // Load terminal session ID from sessionStorage if available
    const savedSessionId = sessionStorage.getItem('morphbox-terminal-session');
    if (savedSessionId) {
      terminalSessionId = savedSessionId;
      console.log('Restored terminal session ID:', terminalSessionId);
    }
    
    // Wait for modules to load
    let attempts = 0;
    console.log('[Terminal] Loading xterm modules...');
    while ((!Terminal || !FitAddon || !WebLinksAddon) && attempts < 50) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    
    if (!Terminal || !FitAddon || !WebLinksAddon) {
      console.error('[Terminal] Failed to load xterm modules after', attempts, 'attempts');
      console.error('[Terminal] Terminal:', !!Terminal, 'FitAddon:', !!FitAddon, 'WebLinksAddon:', !!WebLinksAddon);
      // Show error to user
      writeln('Error: Failed to load terminal modules. Please refresh the page.');
      isInitializing = false;
      return;
    }
    
    console.log('[Terminal] Modules loaded successfully');
    
    const termOptions = getTerminalOptions();
    
    try {
      // Create terminal instance with settings
      console.log('[Terminal] Creating terminal with options:', termOptions);
      terminal = new Terminal({
        fontSize: termOptions.fontSize,
        fontFamily: termOptions.fontFamily,
        lineHeight: termOptions.lineHeight,
        letterSpacing: 0,
        scrollback: 10000,
        smoothScrollDuration: 100,
        cursorBlink: termOptions.cursorBlink,
        cursorStyle: termOptions.cursorStyle,
        allowTransparency: false,
        tabStopWidth: 8,
        screenReaderMode: false,
        // Ensure proper terminal type for arrow keys
        convertEol: true,
        termName: 'xterm-256color',
        // Start with standard terminal dimensions
        cols: 80,
        rows: 24
      });
      
      // Apply initial theme
      updateTerminalSettings();
      
      // Load addons
      console.log('[Terminal] Loading addons...');
      fitAddon = new FitAddon();
      terminal.loadAddon(fitAddon);
      terminal.loadAddon(new WebLinksAddon());
      
      // Open terminal in container
      console.log('[Terminal] Opening terminal in container...');
      terminal.open(terminalContainer);
      console.log('[Terminal] Terminal opened successfully');
      
      // Mobile-specific check
      if (getViewportInfo().isTouchDevice) {
        console.log('[Terminal] Mobile device detected - applying mobile fixes');
        // Force terminal to render
        terminal.refresh(0, terminal.rows - 1);
      }
    } catch (error) {
      console.error('[Terminal] Error initializing terminal:', error);
      isInitializing = false;
      if (terminalContainer) {
        const isMobile = getViewportInfo().isTouchDevice;
        terminalContainer.innerHTML = `<div style="color: red; padding: 20px;">
          Error initializing terminal${isMobile ? ' on mobile' : ''}. 
          ${isMobile ? 'Mobile terminal support is limited. ' : ''}
          Please refresh the page.
        </div>`;
      }
      return;
    }
    
    // Initial fit after terminal is ready
    setTimeout(() => {
      // Force initial resize to apply font scaling
      if (handleResize) {
        handleResize();
      }
    }, 100);
    
    // Debounce function for performance
    let resizeTimeout: number | null = null;
    const debounce = (func: Function, wait: number) => {
      return (...args: any[]) => {
        if (resizeTimeout) clearTimeout(resizeTimeout);
        resizeTimeout = window.setTimeout(() => func(...args), wait);
      };
    };
    
    // Handle resize events with performance optimization
    const handleResize = () => {
      if (fitAddon && terminal && terminalContainer) {
        try {
          // CRITICAL: Set absolute minimum columns to prevent character wrapping
          const MIN_COLS = 80; // Standard terminal width
          const MIN_ROWS = 24; // Standard terminal height
          
          // Get what FitAddon thinks should fit
          const proposed = fitAddon.proposeDimensions();
          
          if (!proposed || proposed.cols < MIN_COLS || proposed.rows < MIN_ROWS) {
            // Container is too small for minimum terminal size
            // Keep terminal at minimum size and let container scroll
            if (terminal.cols !== MIN_COLS || terminal.rows !== MIN_ROWS) {
              terminal.resize(MIN_COLS, MIN_ROWS);
              
              // Send dimensions to PTY
              if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({
                  type: 'RESIZE',
                  payload: { 
                    cols: MIN_COLS,
                    rows: MIN_ROWS
                  }
                }));
              }
            }
          } else {
            // Container is large enough, use FitAddon's calculation
            fitAddon.fit();
            
            // Send actual dimensions to PTY
            if (ws && ws.readyState === WebSocket.OPEN) {
              const actualDims = fitAddon.proposeDimensions();
              if (actualDims && actualDims.cols > 0 && actualDims.rows > 0) {
                ws.send(JSON.stringify({
                  type: 'RESIZE',
                  payload: { 
                    cols: actualDims.cols,
                    rows: actualDims.rows
                  }
                }));
              }
            }
          }
        } catch (err) {
          console.error('Error during terminal resize:', err);
        }
      }
    };
    
    // Debounced resize handler
    const debouncedResize = debounce(handleResize, 150);
    
    // Use ResizeObserver for container-based responsiveness
    const resizeObserver = new ResizeObserver(debouncedResize);
    resizeObserver.observe(terminalContainer);
    
    // Also listen to window resize for viewport changes
    window.addEventListener('resize', debouncedResize);
    
    // Handle orientation changes on mobile
    window.addEventListener('orientationchange', () => {
      setTimeout(handleResize, 100); // Small delay for orientation to settle
    });
    
    // Trigger immediate resize to apply scaling
    handleResize();
    
    // Handle terminal input - send directly to Claude without buffering
    terminal.onData((data: string) => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        const message = JSON.stringify({
          type: 'SEND_INPUT',
          payload: { input: data }
        });
        ws.send(message);
      }
    });
    
    // Connect to WebSocket
    connectWebSocket();
    
    // Initial message
    writeln('MorphBox Terminal v2.0.0');
    if (autoLaunchClaude) {
      writeln('Launching Claude...');
    }
    
    // Add timeout to prevent infinite loading on mobile
    setTimeout(() => {
      if (isInitializing) {
        console.error('[Terminal] Initialization timeout - forcing completion');
        isInitializing = false;
      }
    }, 10000); // 10 second timeout
    
    // Mobile-specific fix: Force a resize after initialization
    if (getViewportInfo().isTouchDevice) {
      setTimeout(() => {
        console.log('[Terminal] Mobile detected - forcing resize');
        handleResize();
        // Also force fit addon to recalculate
        if (fitAddon) {
          fitAddon.fit();
        }
        // Don't set fixed height - let xterm manage it
      }, 2000);
    }
    
    // Subscribe to settings changes
    settingsUnsubscribe = settings.subscribe(() => {
      updateTerminalSettings();
    });
    
    // Cleanup function
    return () => {
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
      if (settingsUnsubscribe) {
        settingsUnsubscribe();
      }
    };
  });
  
  onDestroy(() => {
    // Clear any pending output buffer
    if (flushTimeout) {
      cancelAnimationFrame(flushTimeout);
    }
    outputBuffer = [];
    
    if (ws) {
      ws.close();
    }
    if (terminal) {
      terminal.dispose();
    }
  });
</script>

<div class="terminal-outer-container">
  {#if connectionStatus === 'reconnecting'}
    <div class="connection-status reconnecting">
      <span class="status-icon">⟳</span>
      Reconnecting... (attempt {reconnectAttempts})
    </div>
  {/if}
  
  {#if isInitializing}
    <div class="loading-overlay">
      <div class="loading-content">
        <div class="loading-spinner"></div>
        <div class="loading-text">Loading Claude...</div>
      </div>
    </div>
  {/if}
  
  <div 
    bind:this={terminalContainer}
    class="terminal-container"
    class:loading={isInitializing || connectionStatus !== 'connected'}
  />
</div>

<style>
  .terminal-outer-container {
    width: 100%;
    height: 100%;
    position: relative;
    overflow: hidden;
    max-height: 100%;
  }
  
  .terminal-container {
    width: 100%;
    height: 100%;
    background-color: #1e1e1e;
    /* Enable container queries */
    container-type: inline-size;
    /* Handle overflow for small containers */
    min-width: 0;
    overflow: auto;
    position: relative;
  }
  
  .terminal-container.loading {
    opacity: 0.2;
  }
  
  .loading-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: rgba(30, 30, 30, 0.9);
    z-index: 100;
    pointer-events: none; /* Allow interaction with terminal underneath */
  }
  
  .loading-content {
    text-align: center;
    color: var(--text-primary, #d4d4d4);
  }
  
  .loading-spinner {
    width: 40px;
    height: 40px;
    margin: 0 auto 16px;
    border: 3px solid rgba(255, 255, 255, 0.1);
    border-top-color: var(--accent-color, #0e639c);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }
  
  .loading-text {
    font-size: 16px;
    font-weight: 500;
  }
  
  .connection-status {
    position: absolute;
    top: 10px;
    right: 10px;
    background: rgba(0, 0, 0, 0.8);
    color: #fff;
    padding: 8px 16px;
    border-radius: 4px;
    font-size: 14px;
    z-index: 100;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  
  .connection-status.reconnecting {
    background: rgba(255, 152, 0, 0.9);
  }
  
  .status-icon {
    display: inline-block;
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  
  :global(.terminal-wrapper .xterm) {
    padding: 10px;
    height: 100%;
    /* Remove constraints to allow natural sizing */
    display: block;
  }
  
  /* Scale padding with container size */
  @container (max-width: 400px) {
    :global(.terminal-wrapper .xterm) {
      padding: 4px !important;
    }
  }
  
  @container (max-width: 600px) {
    :global(.terminal-wrapper .xterm) {
      padding: 6px !important;
    }
  }
  
  :global(.xterm-viewport) {
    background-color: #1e1e1e;
    /* Let xterm handle scrolling */
    overflow-y: scroll !important;
    overflow-x: auto !important;
  }
  
  :global(.xterm-screen) {
    margin: 0;
  }
  
  /* Allow terminal to handle its own layout */
  :global(.xterm-rows) {
    /* Let xterm.js manage line wrapping */
    min-width: 0;
  }
  
  /* Let terminal maintain its natural size */
  :global(.xterm) {
    /* Remove width constraints to prevent forced fitting */
    height: 100% !important;
  }
  
  /* Let terminal handle its own sizing */
  :global(.xterm-screen) {
    /* Don't force width */
  }
  
  /* Ensure canvas renders properly at all sizes */
  :global(.xterm .xterm-text-layer),
  :global(.xterm .xterm-cursor-layer),
  :global(.xterm .xterm-selection-layer) {
    /* Force re-render on resize */
    will-change: transform;
  }
  
  /* Handle very small terminals */
  :global(.xterm.xterm-cursor-blink) {
    /* Reduce animation overhead on small sizes */
    animation-duration: 1s;
  }
  
  :global(.xterm-helper-textarea) {
    /* Prevent zoom on mobile when focusing input */
    font-size: 16px !important;
  }
  
  /* Container-based responsive styles */
  @container (max-width: 600px) {
    :global(.terminal-wrapper .xterm) {
      padding: var(--spacing-sm);
    }
    
    :global(.xterm-viewport) {
      /* Optimize scrolling on small containers */
      scroll-behavior: auto;
    }
  }
  
  /* Viewport-based responsive styles */
  @media (max-width: 768px) {
    :global(.terminal-wrapper .xterm) {
      padding: 5px !important; /* Reduce padding on mobile */
    }
    
    /* Fix loading opacity on mobile only */
    .terminal-container.loading {
      opacity: 1;
    }
    
    /* Debug: ensure container is visible */
    .terminal-container {
      background-color: #1e1e1e !important;
    }
    
    /* Mobile-specific viewport fixes */
    :global(.xterm-viewport) {
      /* Only fix positioning issues */
      left: 0 !important;
      transform: none !important;
      /* Keep native touch scrolling */
      -webkit-overflow-scrolling: touch;
    }
    
    /* Keep terminal content visible but don't override display properties */
    :global(.xterm-screen),
    :global(.xterm .xterm-text-layer),
    :global(.xterm .xterm-cursor-layer) {
      opacity: 1 !important;
    }
    
    .terminal-container {
      /* Remove fixed positioning that was causing issues */
      position: relative;
      /* Mobile needs specific height to prevent excess space */
      height: calc(100vh - 100px); /* Account for UI elements */
      max-height: 100%;
      /* Reset any transforms */
      transform: none !important;
      left: 0 !important;
      right: 0 !important;
    }
    
    :global(.xterm-rows) {
      /* Allow horizontal scroll for long lines on mobile */
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
    }
    
    :global(.xterm-cursor-layer) {
      /* Make cursor more visible on mobile */
      z-index: 10;
    }
    
    /* Connection status adjustments */
    .connection-status {
      font-size: var(--font-size-sm);
      padding: var(--spacing-xs) var(--spacing-sm);
    }
  }
  
  /* Touch-friendly adjustments */
  @media (pointer: coarse) {
    :global(.xterm-screen) {
      /* Increase line height for better touch selection */
      line-height: 1.3;
    }
    
    :global(.xterm-selection-layer) {
      /* Make selection more visible on touch devices */
      opacity: 0.4;
    }
  }
  
  /* Prevent zoom on input focus for iOS */
  @media (hover: none) and (pointer: coarse) {
    :global(.xterm-helper-textarea) {
      font-size: 16px !important;
    }
  }
</style>