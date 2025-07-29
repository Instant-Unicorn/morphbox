#!/usr/bin/env node

import polka from 'polka';

console.log('Starting test server...');
console.log('PORT env:', process.env.PORT);
console.log('HOST env:', process.env.HOST);

const port = process.env.PORT || 8008;
const host = process.env.HOST || 'localhost';

console.log('Using port:', port);
console.log('Using host:', host);

const server = polka();

server.get('/', (req, res) => {
  res.end('Test server is working!');
});

server.listen({ port: Number(port), host }, (err) => {
  if (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
  console.log(`Test server running on http://${host}:${port}`);
});

// Keep server running
process.on('SIGINT', () => {
  console.log('Shutting down...');
  process.exit(0);
});