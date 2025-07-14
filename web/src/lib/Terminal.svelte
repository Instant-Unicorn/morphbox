<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { browser } from '$app/environment';
  
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
    
    ws = new WebSocket(websocketUrl);
    
    ws.onopen = () => {
      writeln('Connected to server');
    };
    
    ws.onmessage = (event) => {
      write(event.data);
    };
    
    ws.onerror = (error) => {
      writeln(`\r\nWebSocket error: ${error}`);
    };
    
    ws.onclose = () => {
      writeln('\r\nDisconnected from server');
      // Attempt to reconnect after 3 seconds
      setTimeout(() => {
        if (ws?.readyState === WebSocket.CLOSED) {
          writeln('\r\nAttempting to reconnect...');
          connectWebSocket();
        }
      }, 3000);
    };
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
    
    // Create terminal instance
    terminal = new Terminal({
      theme: {
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
      },
      fontSize: 14,
      fontFamily: '"Cascadia Code", "Fira Code", "Consolas", "Courier New", monospace',
      lineHeight: 1.2,
      letterSpacing: 0,
      scrollback: 10000,
      smoothScrollDuration: 100,
      cursorBlink: true,
      cursorStyle: 'block',
      allowTransparency: false,
      tabStopWidth: 8,
      screenReaderMode: false
    });
    
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
      fitAddon.fit();
    };
    window.addEventListener('resize', handleResize);
    
    // Handle terminal input
    terminal.onData((data: string) => {
      // Send input to WebSocket if connected
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    });
    
    // Connect to WebSocket
    connectWebSocket();
    
    // Initial message
    writeln('MorphBox Terminal v2.0.0');
    writeln('Connecting to server...\r\n');
    
    // Cleanup function
    return () => {
      window.removeEventListener('resize', handleResize);
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

<div 
  bind:this={terminalContainer}
  class="terminal-container"
/>

<style>
  .terminal-container {
    width: 100%;
    height: 100%;
    background-color: #1e1e1e;
  }
  
  :global(.xterm) {
    padding: 10px;
    height: 100%;
  }
  
  :global(.xterm-viewport) {
    background-color: #1e1e1e;
  }
  
  :global(.xterm-screen) {
    margin: 0;
  }
</style>