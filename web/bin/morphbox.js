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

// Get the installation directory
function getInstallationDir() {
  // The actual morphbox files are packaged with npm
  // They're in the parent directory of bin/
  const npmPackageRoot = path.resolve(__dirname, '..');
  return npmPackageRoot;
}

// Check Docker is available
async function checkDocker() {
  const { execSync } = await import('child_process');
  
  try {
    execSync('docker --version', { stdio: 'ignore' });
    execSync('docker ps', { stdio: 'ignore' });
  } catch (e) {
    log.error('Docker is not installed or not running. Please install Docker first.');
    log.info('Visit: https://docs.docker.com/get-docker/');
    process.exit(1);
  }
}

// Main function
async function main() {
  // Check for help flag
  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    process.exit(0);
  }
  
  // Check Docker is available
  await checkDocker();
  
  // Get the installation directory (from npm package)
  const morphboxHome = getInstallationDir();
  const morphboxStart = path.join(morphboxHome, 'scripts', 'morphbox-start');
  
  // Check if morphbox-start exists
  if (!fs.existsSync(morphboxStart)) {
    log.error('MorphBox installation is incomplete.');
    log.info('Please reinstall with: npm install -g morphbox');
    process.exit(1);
  }
  
  // Set environment variable for user's current directory
  process.env.MORPHBOX_USER_DIR = process.cwd();
  
  // Forward all arguments to morphbox-start
  const child = spawn(morphboxStart, args, {
    stdio: 'inherit',
    // Don't change directory - let the script run from user's current directory
    // This ensures INITIAL_PWD captures the correct directory
    env: process.env  // Pass environment variables including MORPHBOX_USER_DIR
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
main().catch(err => {
  log.error(`Unexpected error: ${err.message}`);
  process.exit(1);
});