<script lang="ts">
  import { onMount, onDestroy, createEventDispatcher } from 'svelte';
  import { browser } from '$app/environment';
  import { settings } from '$lib/panels/Settings';
  
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
  
  let terminalContainer: HTMLDivElement;
  let terminal: Terminal;
  let fitAddon: FitAddon;
  let ws: WebSocket | null = null;
  let inputBuffer = '';
  let settingsUnsubscribe: (() => void) | null = null;
  
  const dispatch = createEventDispatcher();
  
  export function write(data: string) {
    if (terminal) {
      terminal.write(data);
    }
  }
  
  export function writeln(data: string) {
    if (terminal) {
      terminal.writeln(data);
    }
  }
  
  export function clear() {
    if (terminal) {
      terminal.clear();
    }
  }
  
  function connectWebSocket() {
    if (ws) {
      ws.close();
    }
    
    console.log('Connecting to WebSocket:', websocketUrl);
    ws = new WebSocket(websocketUrl);
    
    ws.onopen = () => {
      console.log('WebSocket connected');
      writeln('Connected to server');
      dispatch('connection', { connected: true });
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
            dispatch('agent', { 
              status: 'Active', 
              agentId: message.payload?.agentId 
            });
            break;
          case 'AGENT_EXIT':
            dispatch('agent', { status: 'No agent' });
            break;
          case 'OUTPUT':
            if (message.payload?.data) {
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
      writeln(`\r\nDisconnected from server (code: ${event.code})`);
      dispatch('connection', { connected: false });
      dispatch('agent', { status: 'No agent' });
      
      // Only reconnect if it wasn't a normal closure
      if (event.code !== 1000 && event.code !== 1001) {
        setTimeout(() => {
          if (!ws || ws.readyState === WebSocket.CLOSED) {
            writeln('\r\nAttempting to reconnect...');
            connectWebSocket();
          }
        }, 3000);
      }
    };
  }
  
  // Detect if we're on a mobile device
  function isMobile() {
    return window.innerWidth <= 768 || ('ontouchstart' in window);
  }
  
  // Calculate appropriate font size and dimensions for mobile
  function getTerminalOptions() {
    const mobile = isMobile();
    const currentSettings = $settings;
    const fontSize = mobile ? 12 : (currentSettings?.terminal.fontSize || 14);
    const fontFamily = currentSettings?.terminal.fontFamily || '"Cascadia Code", "Fira Code", monospace';
    const cols = mobile ? Math.floor((window.innerWidth - 20) / 7) : 80;
    const rows = mobile ? Math.floor((window.innerHeight - 100) / 20) : 30;
    
    return {
      fontSize,
      fontFamily,
      cols,
      rows,
      lineHeight: currentSettings?.terminal.lineHeight || 1.2,
      cursorStyle: currentSettings?.terminal.cursorStyle || 'block',
      cursorBlink: currentSettings?.terminal.cursorBlink ?? true,
      allowProposedApi: true
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
    
    // Wait for modules to load
    let attempts = 0;
    while ((!Terminal || !FitAddon || !WebLinksAddon) && attempts < 50) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    
    if (!Terminal || !FitAddon || !WebLinksAddon) {
      console.error('Failed to load xterm modules');
      return;
    }
    
    const termOptions = getTerminalOptions();
    
    // Create terminal instance with settings
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
      // Set initial dimensions
      cols: termOptions.cols,
      rows: termOptions.rows
    });
    
    // Apply initial theme
    updateTerminalSettings();
    
    // Load addons
    fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    terminal.loadAddon(new WebLinksAddon());
    
    // Open terminal in container
    terminal.open(terminalContainer);
    
    // Initial fit
    fitAddon.fit();
    
    // Handle window resize
    const handleResize = () => {
      if (fitAddon && terminal) {
        // On mobile, recalculate dimensions based on viewport
        if (isMobile()) {
          const termOptions = getTerminalOptions();
          terminal.options.fontSize = termOptions.fontSize;
          
          // Use fit addon to automatically size to container
          fitAddon.fit();
          
          // Send resize command to PTY
          if (ws && ws.readyState === WebSocket.OPEN) {
            const dimensions = fitAddon.proposeDimensions();
            if (dimensions) {
              ws.send(JSON.stringify({
                type: 'RESIZE',
                payload: { 
                  cols: dimensions.cols,
                  rows: dimensions.rows
                }
              }));
            }
          }
        } else {
          fitAddon.fit();
        }
      }
    };
    
    // Use ResizeObserver for better responsiveness
    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });
    resizeObserver.observe(terminalContainer);
    
    window.addEventListener('resize', handleResize);
    
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
    writeln('Launching Claude...');
    
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
    if (ws) {
      ws.close();
    }
    if (terminal) {
      terminal.dispose();
    }
  });
</script>

<div class="terminal-outer-container">
  <div 
    bind:this={terminalContainer}
    class="terminal-container"
  />
</div>

<style>
  .terminal-outer-container {
    width: 100%;
    height: 100%;
    position: relative;
    overflow: hidden;
  }
  
  .terminal-container {
    width: 100%;
    height: 100%;
    background-color: #1e1e1e;
  }
  
  :global(.terminal-wrapper .xterm) {
    padding: 10px;
    height: 100%;
  }
  
  :global(.xterm-viewport) {
    background-color: #1e1e1e;
  }
  
  :global(.xterm-screen) {
    margin: 0;
  }
  
  /* Mobile-specific styles */
  @media (max-width: 768px) {
    :global(.terminal-wrapper .xterm) {
      padding: 5px;
    }
    
    .terminal-container {
      /* Prevent iOS bounce scrolling */
      -webkit-overflow-scrolling: touch;
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
    }
    
    :global(.xterm-rows) {
      /* Ensure text doesn't overflow on mobile */
      overflow-x: hidden;
    }
    
    :global(.xterm-cursor-layer) {
      /* Make cursor more visible on mobile */
      z-index: 10;
    }
  }
  
  /* Prevent zoom on input focus for iOS */
  @media (hover: none) and (pointer: coarse) {
    :global(.xterm-helper-textarea) {
      font-size: 16px !important;
    }
  }
</style>