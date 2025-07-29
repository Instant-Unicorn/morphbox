#!/usr/bin/env node

import polka from 'polka';

const port = 8008;
const host = 'localhost';

console.log('Creating minimal test server...');

const server = polka();

server.get('/', (req, res) => {
  res.end('Test server is working!');
});

console.log(`Attempting to listen on ${host}:${port}...`);

const httpServer = server.listen({ host, port }, (err) => {
  if (err) {
    console.error('Failed to start:', err);
    process.exit(1);
  }
  console.log(`Server listening on http://${host}:${port}`);
  
  const addr = httpServer.address();
  console.log('Actual address:', addr);
});

// Keep alive
setInterval(() => {}, 1000);