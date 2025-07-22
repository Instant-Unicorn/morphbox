<script lang="ts">
  import { onMount, onDestroy, createEventDispatcher, beforeUpdate, afterUpdate } from 'svelte';
  import { browser } from '$app/environment';
  import { settings } from '$lib/panels/Settings/settings-store';
  import { fade } from 'svelte/transition';
  import logger from '$lib/utils/browser-logger';
  
  // Global terminal instances for debugging
  declare global {
    interface Window {
      morphboxTerminals?: Record<string, {
        sendInput: (input: string) => void;
        write: (data: string) => void;
        writeln: (data: string) => void;
        clear: () => void;
        clearSession: () => void;
      }>;
    }
  }
  
  let Terminal: any;
  let FitAddon: any;
  let WebLinksAddon: any;
  
  // Only import xterm in the browser
  if (browser) {
    import('@xterm/xterm').then(module => {
      Terminal = module.Terminal;
    });
    import('@xterm/addon-fit').then(module => {
      FitAddon = module.FitAddon;
    });
    import('@xterm/addon-web-links').then(module => {
      WebLinksAddon = module.WebLinksAddon;
    });
    import('@xterm/xterm/css/xterm.css');
  }

  export let websocketUrl = 'ws://localhost:3000';
  export let autoLaunchClaude = false;
  export let panelId: string = '';
  
  let terminalContainer: HTMLDivElement;
  let terminal: Terminal;
  let fitAddon: FitAddon;
  let ws: WebSocket | null = null;
  let inputBuffer = '';
  let settingsUnsubscribe: (() => void) | null = null;
  let reconnectAttempts = 0;
  let isReconnecting = false;
  let connectionStatus: 'connected' | 'disconnected' | 'reconnecting' = 'disconnected';
  export let terminalSessionId: string | null = null;
  let isInitializing = true;
  let hideLogoTimeout: number | null = null;
  
  // Store references to event handlers and observers for cleanup
  let resizeObserver: ResizeObserver | null = null;
  let mutationObserver: MutationObserver | null = null;
  let windowResizeHandler: (() => void) | null = null;
  let orientationChangeHandler: (() => void) | null = null;
  
  const dispatch = createEventDispatcher();
  
  // Dispatch ready event when component is mounted with methods
  onMount(() => {
    dispatch('ready', {
      sendInput,
      write,
      writeln,
      clear,
      clearSession
    });
  });
  
  // Output buffering for performance
  let outputBuffer: string[] = [];
  let flushTimeout: number | null = null;
  let earlyMessages: string[] = [];
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
    } else {
      // Store early messages to display when terminal is ready
      earlyMessages.push(data);
      console.log('[Terminal] Buffering early message:', data);
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
      localStorage.removeItem('morphbox-terminal-session');
    }
    writeln('\r\n🔄 Session cleared. Next connection will start fresh.');
  }
  
  export function sendInput(input: string) {
    console.log('[Terminal.sendInput] Called with:', input, 'WebSocket state:', ws?.readyState);
    if (ws && ws.readyState === WebSocket.OPEN) {
      const message = JSON.stringify({
        type: 'SEND_INPUT',
        payload: { input }
      });
      console.log('[Terminal.sendInput] Sending message:', message);
      ws.send(message);
      // Don't write to terminal here - let the server echo it back
      // This ensures the input goes through the proper terminal/shell processing
    } else {
      console.warn('[Terminal.sendInput] WebSocket not ready:', ws?.readyState);
    }
  }
  
  // Test function to verify logging is working
  export function testLogging() {
    logger.info('[Terminal] Test log - Info level', { test: true, timestamp: Date.now() });
    logger.error('[Terminal] Test log - Error level', { test: true, error: 'This is a test error' });
    logger.warn('[Terminal] Test log - Warning level', { test: true });
    logger.debug('[Terminal] Test log - Debug level', { test: true });
    console.log('[Terminal] Test logging completed - check logs/browser-logs.jsonl');
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
    // Prevent multiple simultaneous connections
    if (ws && (ws.readyState === WebSocket.CONNECTING || ws.readyState === WebSocket.OPEN)) {
      console.warn('[Terminal] WebSocket already connecting or connected, skipping new connection');
      return;
    }
    
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
      urlObj.searchParams.set('persistent', 'true'); // Enable persistent sessions
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
      logger.info('[Terminal] WebSocket connected successfully');
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
            // Hide loading overlay immediately when agent is launched
            console.log('[Terminal] Agent launched, hiding loading overlay');
            isInitializing = false;
            if (hideLogoTimeout) {
              clearTimeout(hideLogoTimeout);
              hideLogoTimeout = null;
            }
            dispatch('agent', { 
              status: 'Active', 
              agentId: message.payload?.agentId 
            });
            break;
          case 'TERMINAL_SESSION_ID':
            if (message.payload?.sessionId) {
              const isNewSession = terminalSessionId !== message.payload.sessionId;
              terminalSessionId = message.payload.sessionId;
              // Store in localStorage for persistence across browser restarts
              if (browser) {
                localStorage.setItem('morphbox-terminal-session', terminalSessionId);
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
            console.log('[Terminal] OUTPUT message received:', {
              hasPayload: !!message.payload,
              hasData: !!message.payload?.data,
              dataLength: message.payload?.data?.length,
              dataPreview: message.payload?.data?.substring(0, 50)
            });
            if (message.payload?.data) {
              // Immediately hide loading overlay on first output
              if (isInitializing) {
                console.log('[Terminal] First output received, hiding loading overlay');
                isInitializing = false;
                if (hideLogoTimeout) {
                  clearTimeout(hideLogoTimeout);
                  hideLogoTimeout = null;
                }
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
      logger.error('[Terminal] WebSocket error:', error);
      console.error('WebSocket error:', error);
      writeln(`\r\nWebSocket error: ${error}`);
    };
    
    ws.onclose = (event) => {
      logger.info('[Terminal] WebSocket closed', { code: event.code, reason: event.reason });
      console.log('[Terminal] WebSocket closed:', {
        code: event.code,
        reason: event.reason,
        wasClean: event.wasClean,
        readyState: ws?.readyState,
        timestamp: new Date().toISOString()
      });
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
    
    const info = { width, height, isSmall, isTouchDevice };
    
    // Log viewport info on significant changes
    if (typeof window !== 'undefined' && window.__lastViewportInfo) {
      const last = window.__lastViewportInfo;
      if (last.width !== width || last.height !== height || last.isSmall !== isSmall) {
        console.log('[Terminal.getViewportInfo] Viewport changed:', {
          from: last,
          to: info,
          delta: {
            width: width - last.width,
            height: height - last.height
          },
          devicePixelRatio: window.devicePixelRatio
        });
      }
    }
    
    if (typeof window !== 'undefined') {
      window.__lastViewportInfo = info;
    }
    
    return info;
  }
  
  // Calculate appropriate font size and dimensions based on viewport and container
  function getTerminalOptions() {
    const viewport = getViewportInfo();
    const currentSettings = $settings;
    
    console.log('[Terminal.getTerminalOptions] Starting calculation:', {
      viewport,
      hasContainer: !!terminalContainer,
      currentSettings: currentSettings?.terminal
    });
    
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
      
      console.log('[Terminal.getTerminalOptions] Container dimensions:', {
        rectWidth: rect.width,
        rectHeight: rect.height,
        containerWidth,
        containerHeight,
        fallbackToViewport: rect.width === 0 || rect.height === 0
      });
    }
    
    // Calculate columns and rows based on actual container size
    const charWidth = fontSize * 0.55; // Better approximation for monospace fonts
    const lineHeight = fontSize * (currentSettings?.terminal.lineHeight || 1.2);
    const padding = viewport.isSmall ? 10 : 20;
    
    const cols = Math.max(40, Math.floor((containerWidth - padding * 2) / charWidth));
    const rows = Math.max(10, Math.floor((containerHeight - padding * 2) / lineHeight));
    
    console.log('[Terminal.getTerminalOptions] Calculated dimensions:', {
      fontSize,
      charWidth,
      lineHeight,
      padding,
      cols,
      rows,
      availableWidth: containerWidth - padding * 2,
      availableHeight: containerHeight - padding * 2
    });
    
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
  
  // Measure terminal dimensions based on actual character sizes
  function measureTerminal() {
    console.log('[Terminal.measureTerminal] Starting measurement:', {
      hasBrowser: browser,
      hasContainer: !!terminalContainer,
      hasTerminal: !!terminal,
      timestamp: new Date().toISOString()
    });
    
    if (!browser || !terminalContainer || !terminal) {
      console.warn('[Terminal.measureTerminal] Missing required components, returning defaults');
      return { cols: 80, rows: 24 }; // Default fallback dimensions
    }
    
    try {
      // Get the actual container dimensions
      const rect = terminalContainer.getBoundingClientRect();
      console.log('[Terminal.measureTerminal] Container rect:', {
        width: rect.width,
        height: rect.height,
        top: rect.top,
        left: rect.left,
        right: rect.right,
        bottom: rect.bottom,
        x: rect.x,
        y: rect.y
      });
      
      if (rect.width === 0 || rect.height === 0) {
        console.error('[Terminal.measureTerminal] Container has zero dimensions!', {
          rect,
          containerDisplay: window.getComputedStyle(terminalContainer).display,
          containerVisibility: window.getComputedStyle(terminalContainer).visibility,
          containerOpacity: window.getComputedStyle(terminalContainer).opacity,
          parentElement: terminalContainer.parentElement?.getBoundingClientRect()
        });
        return { cols: 80, rows: 24 };
      }
      
      // First, try to use xterm's actual renderer dimensions if available
      if (terminal._core && terminal._core._renderService && terminal._core._renderService.dimensions) {
        const dimensions = terminal._core._renderService.dimensions;
        if (dimensions.actualCellWidth && dimensions.actualCellHeight) {
          // Use the actual measured cell dimensions from the renderer
          const charWidth = dimensions.actualCellWidth;
          const charHeight = dimensions.actualCellHeight;
          
          // Get the terminal element padding
          const terminalElement = terminalContainer.querySelector('.xterm');
          let paddingLeft = 0, paddingRight = 0, paddingTop = 0, paddingBottom = 0;
          
          if (terminalElement) {
            const computedStyle = window.getComputedStyle(terminalElement);
            paddingLeft = parseFloat(computedStyle.paddingLeft) || 0;
            paddingRight = parseFloat(computedStyle.paddingRight) || 0;
            paddingTop = parseFloat(computedStyle.paddingTop) || 0;
            paddingBottom = parseFloat(computedStyle.paddingBottom) || 0;
          }
          
          // Calculate available space
          const availableWidth = rect.width - paddingLeft - paddingRight;
          const availableHeight = rect.height - paddingTop - paddingBottom;
          
          // Calculate columns and rows
          const cols = Math.max(40, Math.floor(availableWidth / charWidth));
          const rows = Math.max(10, Math.floor(availableHeight / charHeight));
          
          console.log('[Terminal] Using renderer dimensions:', {
            actualCellWidth: charWidth,
            actualCellHeight: charHeight,
            availableWidth,
            availableHeight,
            cols,
            rows
          });
          
          return { cols, rows };
        }
      }
      
      // Second, try to use fitAddon's proposeDimensions
      if (fitAddon) {
        try {
          const proposed = fitAddon.proposeDimensions();
          if (proposed && proposed.cols && proposed.rows) {
            const cols = Math.max(40, proposed.cols);
            const rows = Math.max(10, proposed.rows);
            
            console.log('[Terminal] Using fitAddon.proposeDimensions:', {
              proposedCols: proposed.cols,
              proposedRows: proposed.rows,
              cols,
              rows
            });
            
            return { cols, rows };
          }
        } catch (e) {
          console.warn('[Terminal] fitAddon.proposeDimensions failed:', e);
        }
      }
      
      // Fallback: Use terminal's internal character dimensions if available
      if (terminal._core && terminal._core._charSizeService) {
        const charSizeService = terminal._core._charSizeService;
        if (charSizeService.width && charSizeService.height) {
          const charWidth = charSizeService.width;
          const charHeight = charSizeService.height;
          
          // Get the terminal element padding
          const terminalElement = terminalContainer.querySelector('.xterm');
          let paddingLeft = 0, paddingRight = 0, paddingTop = 0, paddingBottom = 0;
          
          if (terminalElement) {
            const computedStyle = window.getComputedStyle(terminalElement);
            paddingLeft = parseFloat(computedStyle.paddingLeft) || 0;
            paddingRight = parseFloat(computedStyle.paddingRight) || 0;
            paddingTop = parseFloat(computedStyle.paddingTop) || 0;
            paddingBottom = parseFloat(computedStyle.paddingBottom) || 0;
          }
          
          // Calculate available space
          const availableWidth = rect.width - paddingLeft - paddingRight;
          const availableHeight = rect.height - paddingTop - paddingBottom;
          
          // Calculate columns and rows
          const cols = Math.max(40, Math.floor(availableWidth / charWidth));
          const rows = Math.max(10, Math.floor(availableHeight / charHeight));
          
          console.log('[Terminal] Using charSizeService dimensions:', {
            charWidth,
            charHeight,
            availableWidth,
            availableHeight,
            cols,
            rows
          });
          
          return { cols, rows };
        }
      }
      
      // Last resort: Manual measurement
      console.warn('[Terminal] No xterm dimensions available, using manual measurement');
      
      // Get the terminal element
      const terminalElement = terminalContainer.querySelector('.xterm');
      if (!terminalElement) {
        console.warn('[Terminal] Terminal element not found, using rough estimates');
        const fontSize = terminal.options.fontSize || 14;
        const charWidth = fontSize * 0.55; // Better approximation for monospace
        const lineHeight = fontSize * (terminal.options.lineHeight || 1.2);
        const padding = 20;
        
        const cols = Math.max(40, Math.floor((rect.width - padding * 2) / charWidth));
        const rows = Math.max(10, Math.floor((rect.height - padding * 2) / lineHeight));
        
        return { cols, rows };
      }
      
      // Get the computed styles including padding
      const computedStyle = window.getComputedStyle(terminalElement);
      const paddingLeft = parseFloat(computedStyle.paddingLeft) || 0;
      const paddingRight = parseFloat(computedStyle.paddingRight) || 0;
      const paddingTop = parseFloat(computedStyle.paddingTop) || 0;
      const paddingBottom = parseFloat(computedStyle.paddingBottom) || 0;
      
      // Calculate available space
      const availableWidth = rect.width - paddingLeft - paddingRight;
      const availableHeight = rect.height - paddingTop - paddingBottom;
      
      // Create a test element to measure actual character dimensions
      const testElement = document.createElement('div');
      testElement.style.position = 'absolute';
      testElement.style.visibility = 'hidden';
      testElement.style.left = '-9999px';
      testElement.style.fontFamily = terminal.options.fontFamily || '"Cascadia Code", "Fira Code", monospace';
      testElement.style.fontSize = `${terminal.options.fontSize || 14}px`;
      testElement.style.lineHeight = `${terminal.options.lineHeight || 1.2}`;
      testElement.style.whiteSpace = 'pre';
      testElement.style.padding = '0';
      testElement.style.margin = '0';
      testElement.style.border = 'none';
      
      // Use a more accurate test string for monospace fonts
      testElement.textContent = '0123456789'; // 10 characters
      document.body.appendChild(testElement);
      
      // Measure the test element
      const testRect = testElement.getBoundingClientRect();
      const charWidth = testRect.width / 10;
      const charHeight = testRect.height;
      
      // Clean up test element
      document.body.removeChild(testElement);
      
      // Validate measurements
      if (charWidth <= 0 || charHeight <= 0) {
        console.error('[Terminal] Invalid character measurements:', { charWidth, charHeight });
        return { cols: 80, rows: 24 };
      }
      
      // Calculate columns and rows with minimum bounds
      const cols = Math.max(40, Math.floor(availableWidth / charWidth));
      const rows = Math.max(10, Math.floor(availableHeight / charHeight));
      
      // Additional validation for reasonable terminal size
      const maxCols = 300;
      const maxRows = 100;
      
      const finalCols = Math.min(cols, maxCols);
      const finalRows = Math.min(rows, maxRows);
      
      console.log('[Terminal] Manual measurement dimensions:', {
        containerWidth: rect.width,
        containerHeight: rect.height,
        availableWidth,
        availableHeight,
        charWidth,
        charHeight,
        cols: finalCols,
        rows: finalRows
      });
      
      return { cols: finalCols, rows: finalRows };
      
    } catch (error) {
      console.error('[Terminal.measureTerminal] Error during measurement:', {
        error,
        errorMessage: error.message,
        errorStack: error.stack,
        terminalState: {
          hasContainer: !!terminalContainer,
          hasTerminal: !!terminal,
          terminalOptions: terminal?.options
        }
      });
      return { cols: 80, rows: 24 };
    }
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
    
    console.log('[Terminal] onMount started, container exists:', !!terminalContainer);
    
    // Store instance globally for debugging
    if (typeof window !== 'undefined') {
      if (!window.morphboxTerminals) {
        window.morphboxTerminals = {};
      }
      window.morphboxTerminals[panelId] = {
        sendInput,
        write,
        writeln,
        clear,
        clearSession
      };
      console.log('[Terminal] Registered instance globally:', panelId);
    }
    
    // Log terminal initialization
    logger.info('[Terminal] Starting initialization...', {
      timestamp: new Date().toISOString(),
      autoLaunchClaude,
      websocketUrl,
      panelId
    });
    console.log('[Terminal] Starting initialization...');
    console.log('[Terminal] Initial viewport:', getViewportInfo());
    
    // COMPREHENSIVE DOM INSPECTION
    console.log('=== COMPREHENSIVE DOM INSPECTION ===');
    
    // 1. Terminal container itself
    console.log('[DOM] Terminal container:', {
      element: terminalContainer,
      rect: terminalContainer?.getBoundingClientRect(),
      computed: terminalContainer ? {
        display: window.getComputedStyle(terminalContainer).display,
        width: window.getComputedStyle(terminalContainer).width,
        height: window.getComputedStyle(terminalContainer).height,
        position: window.getComputedStyle(terminalContainer).position,
        flexGrow: window.getComputedStyle(terminalContainer).flexGrow,
        flexShrink: window.getComputedStyle(terminalContainer).flexShrink,
        flexBasis: window.getComputedStyle(terminalContainer).flexBasis,
        minWidth: window.getComputedStyle(terminalContainer).minWidth,
        maxWidth: window.getComputedStyle(terminalContainer).maxWidth
      } : null
    });
    
    // 2. Inspect all parent elements up to body
    let currentElement = terminalContainer?.parentElement;
    let parentLevel = 1;
    while (currentElement && currentElement !== document.body) {
      const computedStyles = window.getComputedStyle(currentElement);
      console.log(`[DOM] Parent Level ${parentLevel}:`, {
        tagName: currentElement.tagName,
        className: currentElement.className,
        id: currentElement.id,
        rect: currentElement.getBoundingClientRect(),
        computed: {
          display: computedStyles.display,
          width: computedStyles.width,
          height: computedStyles.height,
          position: computedStyles.position,
          flexDirection: computedStyles.flexDirection,
          flexWrap: computedStyles.flexWrap,
          alignItems: computedStyles.alignItems,
          justifyContent: computedStyles.justifyContent,
          grid: computedStyles.display === 'grid' ? {
            gridTemplateColumns: computedStyles.gridTemplateColumns,
            gridTemplateRows: computedStyles.gridTemplateRows,
            gap: computedStyles.gap
          } : null
        }
      });
      
      // Check for siblings at each level
      const siblings = Array.from(currentElement.children);
      console.log(`[DOM] Siblings at Level ${parentLevel}:`, {
        count: siblings.length,
        siblings: siblings.map(sibling => ({
          tagName: sibling.tagName,
          className: sibling.className,
          id: sibling.id,
          rect: sibling.getBoundingClientRect(),
          isTerminalContainer: sibling === terminalContainer,
          computed: {
            display: window.getComputedStyle(sibling).display,
            width: window.getComputedStyle(sibling).width,
            position: window.getComputedStyle(sibling).position,
            flex: window.getComputedStyle(sibling).flex,
            flexGrow: window.getComputedStyle(sibling).flexGrow
          }
        }))
      });
      
      currentElement = currentElement.parentElement;
      parentLevel++;
    }
    
    // 3. Check for SectionTabs specifically
    const sectionTabs = document.querySelector('.section-tabs');
    if (sectionTabs) {
      const sectionTabsComputed = window.getComputedStyle(sectionTabs);
      console.log('[DOM] SectionTabs found:', {
        element: sectionTabs,
        rect: sectionTabs.getBoundingClientRect(),
        computed: {
          display: sectionTabsComputed.display,
          width: sectionTabsComputed.width,
          height: sectionTabsComputed.height,
          position: sectionTabsComputed.position,
          float: sectionTabsComputed.float,
          flexDirection: sectionTabsComputed.flexDirection
        },
        parent: sectionTabs.parentElement?.className,
        parentRect: sectionTabs.parentElement?.getBoundingClientRect()
      });
    }
    
    // 4. Look for any element taking up horizontal space
    const terminalRect = terminalContainer?.getBoundingClientRect();
    if (terminalRect) {
      console.log('[DOM] Looking for elements taking horizontal space...');
      const allElements = document.querySelectorAll('*');
      const horizontalNeighbors = Array.from(allElements).filter(el => {
        const rect = el.getBoundingClientRect();
        // Check if element is at same vertical level and takes up horizontal space
        return rect.top < terminalRect.bottom && 
               rect.bottom > terminalRect.top && 
               rect.width > 50 && // At least 50px wide
               el !== terminalContainer &&
               !terminalContainer.contains(el);
      });
      
      console.log('[DOM] Potential horizontal neighbors:', {
        count: horizontalNeighbors.length,
        elements: horizontalNeighbors.slice(0, 10).map(el => ({
          tagName: el.tagName,
          className: el.className,
          id: el.id,
          rect: el.getBoundingClientRect(),
          computed: {
            display: window.getComputedStyle(el).display,
            width: window.getComputedStyle(el).width,
            position: window.getComputedStyle(el).position
          }
        }))
      });
    }
    
    // 5. Specifically check for row layout information
    const rowPanel = terminalContainer?.closest('.row-panel');
    const row = terminalContainer?.closest('.row');
    if (row) {
      console.log('[DOM] Row Layout Analysis:');
      console.log('Row element:', {
        id: row.id,
        className: row.className,
        rect: row.getBoundingClientRect(),
        computed: {
          display: window.getComputedStyle(row).display,
          flexDirection: window.getComputedStyle(row).flexDirection,
          width: window.getComputedStyle(row).width,
          maxWidth: window.getComputedStyle(row).maxWidth
        }
      });
      
      // Find all panel containers in the same row
      const panelContainers = row.querySelectorAll('.panel-container');
      console.log(`[DOM] Panels in same row: ${panelContainers.length}`);
      panelContainers.forEach((pc, index) => {
        const panelId = pc.getAttribute('data-panel-id');
        const panelElement = pc.querySelector('.row-panel');
        console.log(`[DOM] Panel ${index + 1} in row:`, {
          panelId,
          containerStyle: pc.getAttribute('style'),
          containerRect: pc.getBoundingClientRect(),
          panelType: panelElement?.querySelector('.panel-title')?.textContent || 'Unknown',
          computed: {
            width: window.getComputedStyle(pc).width,
            flex: window.getComputedStyle(pc).flex,
            maxWidth: window.getComputedStyle(pc).maxWidth
          }
        });
      });
    }
    
    // 6. Check the panel container wrapping the terminal
    const panelContainer = terminalContainer?.closest('.panel-container');
    if (panelContainer) {
      console.log('[DOM] Terminal\'s Panel Container:', {
        style: panelContainer.getAttribute('style'),
        rect: panelContainer.getBoundingClientRect(),
        computed: {
          width: window.getComputedStyle(panelContainer).width,
          maxWidth: window.getComputedStyle(panelContainer).maxWidth,
          flex: window.getComputedStyle(panelContainer).flex
        }
      });
    }
    
    console.log('=== END DOM INSPECTION ===');
    
    console.log('[Terminal] Parent element info:', {
      parent: terminalContainer?.parentElement,
      parentRect: terminalContainer?.parentElement?.getBoundingClientRect(),
      parentComputed: terminalContainer?.parentElement ? {
        display: window.getComputedStyle(terminalContainer.parentElement).display,
        width: window.getComputedStyle(terminalContainer.parentElement).width,
        height: window.getComputedStyle(terminalContainer.parentElement).height
      } : null
    });
    
    // Load terminal session ID from localStorage if available
    const savedSessionId = localStorage.getItem('morphbox-terminal-session');
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
      
      // Wait for container to be available
      if (!terminalContainer) {
        console.error('[Terminal] Container not found! Waiting for DOM...');
        // Wait a bit for DOM to be ready
        await new Promise(resolve => requestAnimationFrame(resolve));
        if (!terminalContainer) {
          console.error('[Terminal] Container still not found after wait!');
          writeln('Error: Terminal container not found. Please refresh the page.');
          isInitializing = false;
          return;
        }
      }
      
      console.log('[Terminal] Container state before open:', {
        element: terminalContainer,
        rect: terminalContainer.getBoundingClientRect(),
        computed: {
          display: window.getComputedStyle(terminalContainer).display,
          width: window.getComputedStyle(terminalContainer).width,
          height: window.getComputedStyle(terminalContainer).height
        }
      });
      
      terminal.open(terminalContainer);
      console.log('[Terminal] Terminal opened successfully');
      
      // Add id to the xterm helper textarea for accessibility
      const helperTextarea = terminalContainer.querySelector('.xterm-helper-textarea');
      if (helperTextarea) {
        helperTextarea.id = `terminal-input-${panelId}`;
        helperTextarea.setAttribute('name', `terminal-input-${panelId}`);
        console.log('[Terminal] Added id to helper textarea:', helperTextarea.id);
      }
      
      // Display any early messages that were buffered
      if (earlyMessages.length > 0) {
        console.log('[Terminal] Displaying', earlyMessages.length, 'buffered messages');
        earlyMessages.forEach(msg => {
          terminal.writeln(msg);
        });
        earlyMessages = [];
      }
      
      // Check for xterm wrapper structure
      const xtermElement = terminalContainer.querySelector('.xterm');
      const xtermScreen = terminalContainer.querySelector('.xterm-screen');
      const xtermViewport = terminalContainer.querySelector('.xterm-viewport');
      
      if (xtermElement) {
        const xtermRect = xtermElement.getBoundingClientRect();
        const xtermStyle = window.getComputedStyle(xtermElement);
        console.log('[Terminal] Xterm element analysis:', {
          dimensions: {
            width: xtermRect.width,
            height: xtermRect.height,
            left: xtermRect.left,
            right: xtermRect.right
          },
          styles: {
            width: xtermStyle.width,
            maxWidth: xtermStyle.maxWidth,
            margin: xtermStyle.margin,
            padding: xtermStyle.padding,
            transform: xtermStyle.transform,
            position: xtermStyle.position
          }
        });
        
        // Check if xterm has a wrapper div
        if (xtermElement.parentElement !== terminalContainer) {
          console.warn('[Terminal] Xterm has unexpected wrapper!', {
            wrapper: xtermElement.parentElement?.className,
            wrapperWidth: xtermElement.parentElement?.getBoundingClientRect().width
          });
        }
      }
      
      console.log('[Terminal] Container state after open:', {
        rect: terminalContainer.getBoundingClientRect(),
        childCount: terminalContainer.children.length,
        xtermElement: !!terminalContainer.querySelector('.xterm')
      });
      
      // Mobile-specific check
      if (getViewportInfo().isTouchDevice) {
        console.log('[Terminal] Mobile device detected - applying mobile fixes');
        console.log('[Terminal] Terminal element dimensions:', {
          xtermElement: terminalContainer.querySelector('.xterm')?.getBoundingClientRect(),
          viewportElement: terminalContainer.querySelector('.xterm-viewport')?.getBoundingClientRect(),
          screenElement: terminalContainer.querySelector('.xterm-screen')?.getBoundingClientRect()
        });
        // Force terminal to render
        terminal.refresh(0, terminal.rows - 1);
      }
    } catch (error) {
      logger.error('[Terminal] Failed to initialize terminal', error);
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
    
    // Register terminal instance globally for keyboard emulation
    if (browser && panelId) {
      if (!window.morphboxTerminals) {
        window.morphboxTerminals = {};
      }
      window.morphboxTerminals[panelId] = {
        sendInput,
        write,
        writeln,
        clear,
        clearSession
      };
      console.log('[Terminal] Registered terminal globally for panel:', panelId);
    }
    
    // Initial fit after terminal is ready
    setTimeout(() => {
      console.log('[Terminal] Initial fit timeout triggered');
      // Force initial resize to apply font scaling
      if (handleResize) {
        handleResize();
      } else {
        console.error('[Terminal] handleResize not available for initial fit!');
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
    
    // Simple resize handler - just measure and resize
    const handleResize = () => {
      // Early exit if component is being destroyed or not ready
      if (!terminal || !terminalContainer) {
        // This is expected during component lifecycle transitions
        // Don't log as warning if component is being destroyed
        if (terminal && !terminalContainer) {
          console.debug('[Terminal.handleResize] Container not ready yet, skipping resize');
        }
        return;
      }
      
      console.log('[Terminal.handleResize] Starting resize process');
      
      try {
        // Log current state before resize
        const beforeRect = terminalContainer.getBoundingClientRect();
        const beforeTerminalSize = {
          cols: terminal.cols,
          rows: terminal.rows,
          fontSize: terminal.options.fontSize
        };
        
        console.log('[Terminal.handleResize] Before resize:', {
          container: {
            width: beforeRect.width,
            height: beforeRect.height
          },
          terminal: beforeTerminalSize,
          viewport: getViewportInfo()
        });
        
        // Measure the terminal dimensions
        const { cols, rows } = measureTerminal();
        
        console.log('[Terminal.handleResize] New dimensions calculated:', {
          cols,
          rows,
          oldCols: terminal.cols,
          oldRows: terminal.rows,
          changed: cols !== terminal.cols || rows !== terminal.rows
        });
        
        // Resize the terminal to fill its container
        terminal.resize(cols, rows);
        
        // Log state after resize
        const afterRect = terminalContainer.getBoundingClientRect();
        console.log('[Terminal.handleResize] After resize:', {
          container: {
            width: afterRect.width,
            height: afterRect.height,
            changed: beforeRect.width !== afterRect.width || beforeRect.height !== afterRect.height
          },
          terminal: {
            cols: terminal.cols,
            rows: terminal.rows,
            actuallyResized: terminal.cols === cols && terminal.rows === rows
          }
        });
        
        // Send the resize message to the websocket
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'RESIZE',
            payload: { cols, rows }
          }));
          console.log('[Terminal.handleResize] Sent resize to websocket:', { cols, rows });
        }
      } catch (err) {
        const errorDetails = {
          error: err,
          errorMessage: err.message,
          errorStack: err.stack,
          terminalState: {
            cols: terminal?.cols,
            rows: terminal?.rows,
            containerExists: !!terminalContainer
          }
        };
        logger.error('[Terminal.handleResize] Resize error', errorDetails);
        console.error('[Terminal.handleResize] Error during resize:', errorDetails);
      }
    };
    
    // Debounced resize handler
    const debouncedResize = debounce(handleResize, 150);
    
    // Use ResizeObserver for container-based responsiveness
    resizeObserver = new ResizeObserver((entries) => {
      console.log('[Terminal.ResizeObserver] Resize event detected:', {
        entries: entries.map(entry => ({
          target: entry.target === terminalContainer ? 'terminalContainer' : 'other',
          contentRect: {
            width: entry.contentRect.width,
            height: entry.contentRect.height,
            top: entry.contentRect.top,
            left: entry.contentRect.left
          },
          borderBoxSize: entry.borderBoxSize?.[0] ? {
            blockSize: entry.borderBoxSize[0].blockSize,
            inlineSize: entry.borderBoxSize[0].inlineSize
          } : null,
          devicePixelContentBoxSize: entry.devicePixelContentBoxSize?.[0] ? {
            blockSize: entry.devicePixelContentBoxSize[0].blockSize,
            inlineSize: entry.devicePixelContentBoxSize[0].inlineSize
          } : null
        }))
      });
      // Only resize if both terminal and container are ready
      if (terminal && terminalContainer) {
        debouncedResize();
      } else {
        console.warn('[Terminal.ResizeObserver] Skipping resize - missing terminal or container:', {
          hasTerminal: !!terminal,
          hasContainer: !!terminalContainer
        });
      }
    });
    
    // Wait for next frame to ensure DOM is ready before observing
    requestAnimationFrame(() => {
      if (terminalContainer) {
        resizeObserver.observe(terminalContainer);
      }
    });
    
    // Also listen to window resize for viewport changes
    windowResizeHandler = () => {
      console.log('[Terminal] Window resize event detected:', {
        viewport: getViewportInfo(),
        timestamp: new Date().toISOString(),
        documentDimensions: {
          width: document.documentElement.clientWidth,
          height: document.documentElement.clientHeight
        }
      });
      debouncedResize();
    };
    window.addEventListener('resize', windowResizeHandler);
    
    // Handle orientation changes on mobile
    orientationChangeHandler = () => {
      const orientation = window.screen?.orientation?.type || 'unknown';
      console.log('[Terminal] Orientation change detected:', {
        orientation,
        angle: window.screen?.orientation?.angle,
        viewport: getViewportInfo(),
        screen: {
          width: window.screen.width,
          height: window.screen.height,
          availWidth: window.screen.availWidth,
          availHeight: window.screen.availHeight
        }
      });
      setTimeout(handleResize, 100); // Small delay for orientation to settle
    };
    window.addEventListener('orientationchange', orientationChangeHandler);
    
    // Trigger resize after DOM is ready
    console.log('[Terminal] Scheduling initial resize after mount');
    requestAnimationFrame(() => {
      if (terminalContainer && terminal) {
        console.log('[Terminal] DOM ready, triggering initial resize');
        handleResize();
      } else {
        console.warn('[Terminal] Skipping initial resize - container or terminal not ready');
      }
    });
    
    // Add MutationObserver to detect DOM/style changes
    mutationObserver = new MutationObserver((mutations) => {
      const relevantMutation = mutations.find(m => 
        m.type === 'attributes' && (m.attributeName === 'style' || m.attributeName === 'class') ||
        m.type === 'childList'
      );
      
      if (relevantMutation) {
        console.log('[Terminal.MutationObserver] DOM change detected:', {
          type: relevantMutation.type,
          target: relevantMutation.target,
          attributeName: relevantMutation.attributeName,
          addedNodes: relevantMutation.addedNodes?.length || 0,
          removedNodes: relevantMutation.removedNodes?.length || 0,
          containerRect: terminalContainer?.getBoundingClientRect(),
          xtermRect: terminalContainer?.querySelector('.xterm')?.getBoundingClientRect()
        });
      }
    });
    
    if (terminalContainer) {
      mutationObserver.observe(terminalContainer, {
        attributes: true,
        childList: true,
        subtree: true,
        attributeFilter: ['style', 'class']
      });
    } else {
      console.warn('[Terminal] Cannot observe mutations - terminalContainer not ready');
    }
    
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
      // Use requestAnimationFrame to ensure DOM is ready
      requestAnimationFrame(() => {
        const viewport = getViewportInfo();
        console.log('[Terminal] Mobile resize fix triggered:', {
          viewport,
          userAgent: navigator.userAgent,
          containerRect: terminalContainer?.getBoundingClientRect(),
          terminalSize: {
            cols: terminal?.cols,
            rows: terminal?.rows
          },
          pixelRatio: window.devicePixelRatio
        });
        
        handleResize();
        // Also force fit addon to recalculate
        if (fitAddon) {
          console.log('[Terminal] Calling fitAddon.fit() for mobile');
          try {
            fitAddon.fit();
            console.log('[Terminal] fitAddon.fit() completed successfully');
          } catch (e) {
            console.error('[Terminal] fitAddon.fit() failed:', e);
          }
        }
        
        // Adjust terminal to show only actual content
        if (terminal && terminalContainer) {
          // Find the last row with content
          let lastContentRow = 0;
          for (let i = terminal.rows - 1; i >= 0; i--) {
            const line = terminal.buffer.active.getLine(i);
            if (line && line.translateToString().trim() !== '') {
              lastContentRow = i;
              break;
            }
          }
          
          // Resize terminal to fit content
          const contentRows = Math.max(lastContentRow + 5, 10); // Add some padding
          if (contentRows < terminal.rows) {
            terminal.resize(terminal.cols, contentRows);
            fitAddon.fit();
          }
        }
      }, 2000);
    }
    
    // Subscribe to settings changes
    settingsUnsubscribe = settings.subscribe(() => {
      updateTerminalSettings();
    });
    
    // Log final terminal state
    console.log('[Terminal] Mount complete. Final state:', {
      terminal: {
        cols: terminal?.cols,
        rows: terminal?.rows,
        fontSize: terminal?.options?.fontSize
      },
      container: terminalContainer?.getBoundingClientRect(),
      viewport: getViewportInfo()
    });
    
    // Cleanup function
    return () => {
      console.log('[Terminal] Running onMount cleanup');
      
      if (windowResizeHandler) {
        window.removeEventListener('resize', windowResizeHandler);
      }
      if (orientationChangeHandler) {
        window.removeEventListener('orientationchange', orientationChangeHandler);
      }
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      if (mutationObserver) {
        mutationObserver.disconnect();
      }
      if (settingsUnsubscribe) {
        settingsUnsubscribe();
      }
    };
  });
  
  onDestroy(() => {
    console.log('[Terminal] onDestroy called, cleaning up...');
    
    // Clear any pending output buffer
    if (flushTimeout) {
      cancelAnimationFrame(flushTimeout);
    }
    outputBuffer = [];
    
    // Clean up global registration
    if (browser && panelId && window.morphboxTerminals && window.morphboxTerminals[panelId]) {
      delete window.morphboxTerminals[panelId];
      console.log('[Terminal] Unregistered terminal globally for panel:', panelId);
    }
    
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
    box-sizing: border-box;
  }
  
  .terminal-container {
    width: 100%;
    height: 100%;
    background-color: #1e1e1e;
    position: relative;
    box-sizing: border-box;
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
    width: 100%;
    display: block;
    box-sizing: border-box;
  }
  
  :global(.xterm-viewport) {
    background-color: #1e1e1e;
    /* Let xterm handle scrolling */
    overflow-y: scroll !important;
    overflow-x: auto !important;
  }
  
  :global(.xterm-screen) {
    margin: 0;
    width: 100% !important;
  }
  
  /* Allow terminal to handle its own layout */
  :global(.xterm-rows) {
    /* Let xterm.js manage line wrapping */
    min-width: 0;
  }
  
  /* Let terminal maintain its natural size */
  :global(.xterm) {
    height: 100%;
    width: 100%;
    box-sizing: border-box;
  }
  
  /* Terminal wrapper styles */
  :global(.terminal-wrapper) {
    width: 100% !important;
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
  
  /* Prevent zoom on input focus for iOS */
  :global(.xterm-helper-textarea) {
    font-size: 16px !important;
  }
</style>