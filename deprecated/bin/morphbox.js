#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Colors for output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

const info = (msg) => console.log(`${colors.green}[INFO]${colors.reset} ${msg}`);
const error = (msg) => {
  console.error(`${colors.red}[ERROR]${colors.reset} ${msg}`);
  process.exit(1);
};
const warn = (msg) => console.log(`${colors.yellow}[WARN]${colors.reset} ${msg}`);

// Parse command line arguments
const args = process.argv.slice(2);
const showHelp = args.includes('--help') || args.includes('-h');
const showVersion = args.includes('--version') || args.includes('-v');

if (showVersion) {
  const pkg = require('../package.json');
  console.log(`MorphBox v${pkg.version}`);
  process.exit(0);
}

if (showHelp) {
  console.log(`
MorphBox - Safe AI Sandbox for Development

Usage: morphbox [OPTIONS]

Options:
  --local       Bind to localhost only (default)
  --external    Bind to all interfaces (WARNING: exposes to network)
  --vpn         Auto-detect and bind to VPN interface
  --terminal    Terminal mode - Claude Code only, no panels
  --auth        Enable authentication (mandatory for --external)
  --dev         Skip security warnings (development mode)
  --version     Show version information
  --help        Show this help message

Examples:
  morphbox                  # Start locally (safe)
  morphbox --terminal       # Claude Code only mode
  morphbox --external       # Expose to network with mandatory auth
  morphbox --vpn            # Bind to VPN interface only
  morphbox --vpn --auth     # VPN mode with authentication

For more information, visit: https://morphbox.iu.dev
`);
  process.exit(0);
}

// Check if Docker is installed
const checkDocker = () => {
  try {
    const result = spawn('docker', ['--version'], { stdio: 'pipe' });
    result.on('error', () => {
      error('Docker is not installed. Please install Docker first: https://docs.docker.com/get-docker/');
    });
  } catch (e) {
    error('Docker is not installed. Please install Docker first: https://docs.docker.com/get-docker/');
  }
};

// Check if we're running from npm global install or npx
const isGlobalInstall = __dirname.includes('node_modules/.bin') || __dirname.includes('npm/lib/node_modules');
const isNpx = process.env.npm_lifecycle_event === 'npx';

// Determine the script directory
let scriptDir;
if (isGlobalInstall || isNpx) {
  // When installed globally or via npx, we need to use the actual package location
  scriptDir = path.resolve(__dirname, '..');
} else {
  // Running from source
  scriptDir = path.resolve(__dirname, '..');
}

// Check if morphbox-start exists
const morphboxStartPath = path.join(scriptDir, 'morphbox-start');
if (!fs.existsSync(morphboxStartPath)) {
  error(`Cannot find morphbox-start script at ${morphboxStartPath}`);
}

// Check Docker before proceeding
checkDocker();

// Forward all arguments to morphbox-start
const morphboxProcess = spawn('bash', [morphboxStartPath, ...args], {
  stdio: 'inherit',
  cwd: scriptDir,
  env: { ...process.env }
});

morphboxProcess.on('error', (err) => {
  error(`Failed to start MorphBox: ${err.message}`);
});

morphboxProcess.on('exit', (code) => {
  process.exit(code || 0);
});

// Forward signals to the child process
process.on('SIGINT', () => {
  morphboxProcess.kill('SIGINT');
});

process.on('SIGTERM', () => {
  morphboxProcess.kill('SIGTERM');
});