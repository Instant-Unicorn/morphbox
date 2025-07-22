#!/usr/bin/env node

import WebSocket from 'ws';

async function testPersistence() {
  console.log('Testing WebSocket session persistence...\n');
  
  // First connection - create a new session
  console.log('1. Creating initial connection...');
  let ws1 = new WebSocket('ws://localhost:8009?autoLaunchClaude=true');
  let sessionId = null;
  
  ws1.on('open', () => {
    console.log('   ✓ Connected');
  });
  
  ws1.on('message', (data) => {
    const message = JSON.parse(data);
    if (message.type === 'CONNECTED' && message.payload?.sessionId) {
      sessionId = message.payload.sessionId;
      console.log(`   ✓ Received session ID: ${sessionId}`);
    }
    if (message.type === 'AGENT_LAUNCHED') {
      console.log(`   ✓ Agent launched: ${message.payload?.agentId}`);
      
      // Send some input
      setTimeout(() => {
        console.log('\n2. Sending test input...');
        ws1.send(JSON.stringify({
          type: 'SEND_INPUT',
          payload: { input: 'echo "Test persistence"\n' }
        }));
        
        // Disconnect after a moment
        setTimeout(() => {
          console.log('\n3. Disconnecting...');
          ws1.close();
        }, 2000);
      }, 1000);
    }
  });
  
  ws1.on('close', () => {
    console.log('   ✓ Disconnected');
    
    if (!sessionId) {
      console.error('   ✗ No session ID received!');
      process.exit(1);
    }
    
    // Wait a bit, then reconnect with the same session ID
    setTimeout(() => {
      console.log('\n4. Reconnecting with session ID...');
      let ws2 = new WebSocket(`ws://localhost:8009?autoLaunchClaude=true&sessionId=${sessionId}`);
      
      ws2.on('open', () => {
        console.log('   ✓ Reconnected');
      });
      
      ws2.on('message', (data) => {
        const message = JSON.parse(data);
        if (message.type === 'CONNECTED' && message.payload?.isReconnection) {
          console.log('   ✓ Server confirmed reconnection');
        }
        if (message.type === 'RECONNECTED') {
          console.log(`   ✓ Reconnected to agent: ${message.payload?.agentId}`);
          console.log('\n✅ Persistence test successful!');
          
          // Clean up
          setTimeout(() => {
            ws2.close();
            process.exit(0);
          }, 1000);
        }
      });
      
      ws2.on('error', (err) => {
        console.error('   ✗ Reconnection error:', err.message);
        process.exit(1);
      });
      
    }, 3000);
  });
  
  ws1.on('error', (err) => {
    console.error('   ✗ Connection error:', err.message);
    process.exit(1);
  });
}

// Run the test
testPersistence().catch(console.error);