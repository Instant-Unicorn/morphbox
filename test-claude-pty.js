const pty = require('node-pty');

console.log('Testing Claude with PTY...');

try {
  const claude = pty.spawn('claude', [], {
    name: 'xterm-color',
    cols: 80,
    rows: 30,
    cwd: process.cwd(),
    env: process.env
  });

  claude.on('data', (data) => {
    console.log('OUTPUT:', data);
  });

  claude.on('exit', (code) => {
    console.log('EXIT:', code);
  });

  // Send a test input after a delay
  setTimeout(() => {
    console.log('Sending input: "Hello Claude"');
    claude.write('Hello Claude\r');
  }, 1000);

  // Exit after 5 seconds
  setTimeout(() => {
    claude.kill();
    process.exit(0);
  }, 5000);
} catch (error) {
  console.error('Error:', error.message);
  console.log('node-pty might not be installed. Let me use a different approach.');
}