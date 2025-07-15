const { spawn } = require('child_process');

console.log('Testing Claude directly...');

const claude = spawn('claude', [], {
  stdio: ['pipe', 'pipe', 'pipe']
});

claude.stdout.on('data', (data) => {
  console.log('STDOUT:', data.toString());
});

claude.stderr.on('data', (data) => {
  console.log('STDERR:', data.toString());
});

claude.on('error', (error) => {
  console.error('ERROR:', error);
});

claude.on('exit', (code) => {
  console.log('EXIT:', code);
});

// Send a test input after a delay
setTimeout(() => {
  console.log('Sending input: "Hello Claude"');
  claude.stdin.write('Hello Claude\n');
}, 1000);

// Exit after 5 seconds
setTimeout(() => {
  claude.kill();
  process.exit(0);
}, 5000);