import WebSocket from 'ws';

const ws = new WebSocket('ws://localhost:8009');

ws.on('open', () => {
  console.log('Connected to WebSocket server');
  
  // Test creating a session
  ws.send(JSON.stringify({
    type: 'CREATE_SESSION',
    payload: {
      workspacePath: '/tmp/test-workspace',
      agentType: 'claude'
    }
  }));
  
  // Request current state
  setTimeout(() => {
    ws.send(JSON.stringify({ type: 'GET_STATE' }));
  }, 1000);
});

ws.on('message', (data) => {
  const message = JSON.parse(data.toString());
  console.log('Received:', JSON.stringify(message, null, 2));
  
  // If session was created, try launching an agent
  if (message.type === 'SESSION_CREATED') {
    console.log('Launching agent...');
    ws.send(JSON.stringify({
      type: 'LAUNCH_AGENT',
      payload: {
        type: 'claude',
        workspacePath: '/tmp/test-workspace'
      }
    }));
  }
  
  // If agent was launched, send a test command
  if (message.type === 'AGENT_LAUNCHED') {
    console.log('Sending test input...');
    ws.send(JSON.stringify({
      type: 'SEND_INPUT',
      payload: {
        input: 'echo "Hello from WebSocket!"'
      }
    }));
    
    // Stop agent after 5 seconds
    setTimeout(() => {
      console.log('Stopping agent...');
      ws.send(JSON.stringify({ type: 'STOP_AGENT' }));
    }, 5000);
  }
  
  // Close connection after agent stops
  if (message.type === 'AGENT_STOPPED') {
    console.log('Test complete, closing connection');
    ws.close();
  }
});

ws.on('error', (error) => {
  console.error('WebSocket error:', error);
});

ws.on('close', () => {
  console.log('Disconnected from WebSocket server');
});