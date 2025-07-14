<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { WebSocketClient } from './websocket';

  export let websocketUrl = 'ws://localhost:8009';

  let wsClient: WebSocketClient;
  let connected = false;
  let messages: string[] = [];
  let sessionId: string | null = null;
  let agentId: string | null = null;

  onMount(() => {
    wsClient = new WebSocketClient({
      url: websocketUrl,
      reconnect: true,
      reconnectDelay: 3000
    });

    wsClient.onOpen(() => {
      connected = true;
      console.log('WebSocket connected');
      addMessage('Connected to WebSocket server');
      
      // Request current state
      sendMessage('GET_STATE');
    });

    wsClient.onClose(() => {
      connected = false;
      console.log('WebSocket disconnected');
      addMessage('Disconnected from WebSocket server');
    });

    wsClient.onMessage((data) => {
      try {
        const message = JSON.parse(data);
        handleMessage(message);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    });

    wsClient.onError((error) => {
      console.error('WebSocket error:', error);
      addMessage(`WebSocket error: ${error}`);
    });

    wsClient.connect();
  });

  onDestroy(() => {
    if (wsClient) {
      wsClient.disconnect();
    }
  });

  function handleMessage(message: any) {
    switch (message.type) {
      case 'STATE_UPDATE':
        addMessage(`State update received: ${message.payload.totalSessions} active sessions`);
        break;
        
      case 'SESSION_CREATED':
        sessionId = message.payload.sessionId;
        addMessage(`Session created: ${sessionId}`);
        break;
        
      case 'AGENT_LAUNCHED':
        agentId = message.payload.agentId;
        addMessage(`Agent launched: ${agentId}`);
        break;
        
      case 'AGENT_OUTPUT':
        addMessage(`Agent output: ${message.payload.data}`);
        break;
        
      case 'AGENT_ERROR':
        addMessage(`Agent error: ${message.payload.error}`);
        break;
        
      case 'AGENT_EXIT':
        addMessage(`Agent exited with code: ${message.payload.code}`);
        agentId = null;
        break;
        
      case 'ERROR':
        addMessage(`Error: ${message.payload.message}`);
        break;
        
      default:
        addMessage(`Unknown message type: ${message.type}`);
    }
  }

  function sendMessage(type: string, payload?: any) {
    if (wsClient && wsClient.isConnected) {
      wsClient.send(JSON.stringify({ type, payload }));
    }
  }

  function addMessage(message: string) {
    messages = [...messages, `[${new Date().toLocaleTimeString()}] ${message}`];
    // Keep only last 100 messages
    if (messages.length > 100) {
      messages = messages.slice(-100);
    }
  }

  function createSession() {
    sendMessage('CREATE_SESSION', {
      workspacePath: '/tmp/morphbox-workspace',
      agentType: 'claude'
    });
  }

  function launchAgent() {
    if (!sessionId) {
      addMessage('No session active. Create a session first.');
      return;
    }
    
    sendMessage('LAUNCH_AGENT', {
      type: 'claude',
      workspacePath: '/tmp/morphbox-workspace'
    });
  }

  function sendInput(input: string) {
    if (!agentId) {
      addMessage('No agent active. Launch an agent first.');
      return;
    }
    
    sendMessage('SEND_INPUT', { input });
  }

  function stopAgent() {
    if (!agentId) {
      addMessage('No agent active.');
      return;
    }
    
    sendMessage('STOP_AGENT');
  }

  let inputValue = '';
  
  function handleSubmit() {
    if (inputValue.trim()) {
      sendInput(inputValue);
      inputValue = '';
    }
  }
</script>

<div class="websocket-example">
  <div class="status">
    Status: {connected ? '🟢 Connected' : '🔴 Disconnected'}
    {#if sessionId}
      | Session: {sessionId}
    {/if}
    {#if agentId}
      | Agent: {agentId}
    {/if}
  </div>

  <div class="controls">
    <button on:click={createSession} disabled={!connected}>
      Create Session
    </button>
    <button on:click={launchAgent} disabled={!connected || !sessionId}>
      Launch Agent
    </button>
    <button on:click={stopAgent} disabled={!connected || !agentId}>
      Stop Agent
    </button>
  </div>

  <div class="input-area">
    <form on:submit|preventDefault={handleSubmit}>
      <input
        type="text"
        bind:value={inputValue}
        placeholder="Type a command..."
        disabled={!connected || !agentId}
      />
      <button type="submit" disabled={!connected || !agentId}>
        Send
      </button>
    </form>
  </div>

  <div class="messages">
    <h3>Messages:</h3>
    <div class="message-list">
      {#each messages as message}
        <div class="message">{message}</div>
      {/each}
    </div>
  </div>
</div>

<style>
  .websocket-example {
    padding: 20px;
    max-width: 800px;
    margin: 0 auto;
  }

  .status {
    padding: 10px;
    background: #f0f0f0;
    border-radius: 5px;
    margin-bottom: 20px;
    font-family: monospace;
  }

  .controls {
    display: flex;
    gap: 10px;
    margin-bottom: 20px;
  }

  .controls button {
    padding: 10px 20px;
    background: #007bff;
    color: white;
    border: none;
    border-radius: 5px;
    cursor: pointer;
  }

  .controls button:disabled {
    background: #ccc;
    cursor: not-allowed;
  }

  .controls button:hover:not(:disabled) {
    background: #0056b3;
  }

  .input-area {
    margin-bottom: 20px;
  }

  .input-area form {
    display: flex;
    gap: 10px;
  }

  .input-area input {
    flex: 1;
    padding: 10px;
    border: 1px solid #ddd;
    border-radius: 5px;
  }

  .input-area button {
    padding: 10px 20px;
    background: #28a745;
    color: white;
    border: none;
    border-radius: 5px;
    cursor: pointer;
  }

  .input-area button:disabled {
    background: #ccc;
    cursor: not-allowed;
  }

  .messages {
    border: 1px solid #ddd;
    border-radius: 5px;
    padding: 10px;
    height: 300px;
    overflow-y: auto;
  }

  .message-list {
    font-family: monospace;
    font-size: 12px;
  }

  .message {
    padding: 2px 0;
    border-bottom: 1px solid #eee;
  }

  .message:last-child {
    border-bottom: none;
  }
</style>