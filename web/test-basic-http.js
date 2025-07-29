const http = require('http');

const server = http.createServer((req, res) => {
  console.log('Got request:', req.url);
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Hello World\n');
});

server.listen(8008, '127.0.0.1', () => {
  console.log('Server running at http://127.0.0.1:8008/');
});

server.on('error', (err) => {
  console.error('Server error:', err);
});