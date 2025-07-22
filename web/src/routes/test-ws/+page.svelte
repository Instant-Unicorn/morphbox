<script>
  import { onMount } from 'svelte';
  
  let messages = [];
  let ws = null;
  let status = 'Disconnected';
  
  onMount(() => {
    connect();
    
    return () => {
      if (ws) {
        ws.close();
      }
    };
  });
  
  function connect() {
    status = 'Connecting...';
    ws = new WebSocket('ws://100.96.36.2:8009?autoLaunchClaude=true&persistent=true');
    
    ws.onopen = () => {
      status = 'Connected';
      addMessage('Connected to WebSocket');
    };
    
    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        addMessage(`${msg.type}: ${JSON.stringify(msg.payload).substring(0, 100)}`);
        
        if (msg.type === 'OUTPUT') {
          addMessage('✅ OUTPUT RECEIVED!');
        }
      } catch (e) {
        addMessage(`Parse error: ${e.message}`);
      }
    };
    
    ws.onerror = (error) => {
      status = 'Error';
      addMessage(`Error: ${error}`);
    };
    
    ws.onclose = (event) => {
      status = 'Disconnected';
      addMessage(`Closed: ${event.code} - ${event.reason}`);
    };
  }
  
  function addMessage(msg) {
    messages = [...messages, `${new Date().toISOString()}: ${msg}`];
    if (messages.length > 50) {
      messages = messages.slice(-50);
    }
  }
</script>

<h1>WebSocket Test</h1>
<p>Status: {status}</p>
<button on:click={connect}>Reconnect</button>

<h2>Messages:</h2>
<div style="height: 400px; overflow-y: auto; border: 1px solid #ccc; padding: 10px; font-family: monospace; font-size: 12px;">
  {#each messages as message}
    <div>{message}</div>
  {/each}
</div>