#!/usr/bin/env node

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import os from 'os';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Colors for output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m'
};

// Helper functions
const log = {
  info: (msg) => console.log(`${colors.green}[INFO]${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}[WARN]${colors.reset} ${msg}`),
  error: (msg) => console.error(`${colors.red}[ERROR]${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✅${colors.reset} ${msg}`)
};

// Parse command line arguments
const args = process.argv.slice(2);

// Show help
function showHelp() {
  console.log(`
${colors.magenta}MorphBox${colors.reset} - Docker-based AI Sandbox

Usage: morphbox [OPTIONS]

Options:
  --terminal    Start Claude in terminal mode (no web interface)
  --local       Bind to localhost only (default)
  --external    Bind to all interfaces (WARNING: exposes to network)
  --vpn         Auto-detect and bind to VPN interface
  --auth        Enable authentication
  --dev         Skip security warnings (development mode)
  --help        Show this help message

Examples:
  morphbox                    # Start web interface locally
  morphbox --terminal         # Start Claude in terminal mode
  morphbox --external --auth  # Expose to network with authentication
  morphbox --vpn              # Bind to VPN interface only

For more information, visit: https://github.com/MicahBly/morphbox
`);
}

// Check if this is the first run (no morphbox installation found)
function checkInstallation() {
  const morphboxHome = path.join(os.homedir(), '.morphbox');
  
  if (!fs.existsSync(morphboxHome)) {
    log.warn('MorphBox is not installed yet.');
    log.info('Please run: morphbox-installer');
    log.info('');
    log.info('Or install MorphBox with:');
    console.log(`  ${colors.blue}npx morphbox-installer${colors.reset}`);
    process.exit(1);
  }
  
  return morphboxHome;
}

// Main function
function main() {
  // Check for help flag
  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    process.exit(0);
  }
  
  // Check installation
  const morphboxHome = checkInstallation();
  const morphboxStart = path.join(morphboxHome, 'morphbox-start');
  
  // Check if morphbox-start exists
  if (!fs.existsSync(morphboxStart)) {
    log.error('MorphBox installation is incomplete.');
    log.info('Please reinstall with: morphbox-installer');
    process.exit(1);
  }
  
  // Forward all arguments to morphbox-start
  const child = spawn(morphboxStart, args, {
    stdio: 'inherit',
    cwd: morphboxHome
  });
  
  child.on('error', (err) => {
    log.error(`Failed to start MorphBox: ${err.message}`);
    process.exit(1);
  });
  
  child.on('exit', (code, signal) => {
    if (signal) {
      process.exit(1);
    }
    process.exit(code || 0);
  });
}

// Run main function
main();