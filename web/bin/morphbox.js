#!/usr/bin/env node

import { spawn, execSync } from 'child_process';
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
  --config      Generate example morphbox.yml configuration file
  --list        List all running MorphBox instances
  --help        Show this help message

Examples:
  morphbox                    # Start web interface locally
  morphbox --terminal         # Start Claude in terminal mode
  morphbox --external --auth  # Expose to network with authentication
  morphbox --vpn              # Bind to VPN interface only
  morphbox --config           # Generate morphbox.yml in current directory
  morphbox --list             # Show all running instances

For more information, visit: https://github.com/instant-unicorn/morphbox
`);
}

// Get the installation directory
function getInstallationDir() {
  // The actual morphbox files are packaged with npm
  // They're in the parent directory of bin/
  const npmPackageRoot = path.resolve(__dirname, '..');
  return npmPackageRoot;
}

// List all running MorphBox instances
function listInstances() {
  const scriptPath = join(getInstallationDir(), 'scripts', 'port-finder.js');

  if (!fs.existsSync(scriptPath)) {
    log.error('Instance tracking not available in this version');
    process.exit(1);
  }

  try {
    // Use execSync to run the port-finder list command
    execSync(`node "${scriptPath}" list`, { stdio: 'inherit' });
  } catch (e) {
    log.error('Failed to list instances: ' + e.message);
    process.exit(1);
  }
}

// Generate example configuration file
function generateConfigFile() {
  const configContent = `# Morphbox Configuration
# Place this file as 'morphbox.yml' in your project directory

# Container configuration
container:
  # Additional packages to install in the container
  packages:
    - vim
    - curl
    - git
    - htop
    
  # Environment variables to set in the container
  environment:
    EDITOR: vim
    TERM: xterm-256color
    
  # Additional ports to expose (besides the default 8008-8009)
  # Default ports: 8008 (web interface), 8009 (WebSocket)
  # If default ports are taken, morphbox automatically increments by 1
  ports: []
    # - 8080  # Uncomment to expose additional port 8080
    # - 8443  # Uncomment to expose additional port 8443
    
  # Custom shell (default: /bin/bash)
  shell: /bin/bash

# Network configuration
network:
  # Website allowlist - only these domains will be accessible
  # If empty or not specified, all websites are allowed
  allowlist:
    - github.com
    - "*.githubusercontent.com"
    - npmjs.org
    - registry.npmjs.org
    - pypi.org
    - files.pythonhosted.org
    - golang.org
    - proxy.golang.org
    - localhost
    - 127.0.0.1
    
  # Block list - these domains will be blocked
  # Applied after allowlist (if both are specified)
  blocklist:
    # - facebook.com
    # - "*.facebook.com"

# Security configuration
security:
  # Disable network access entirely (default: false)
  no_network: false
  
  # Read-only filesystem (except for specific directories)
  readonly_root: false
  
  # Memory limit (e.g., "512m", "2g")
  memory_limit: "2g"
  
  # CPU limit (number of CPUs)
  cpu_limit: 2

# Development tools
development:
  # Pre-install language runtimes
  runtimes:
    node: "20"  # Node.js version
    python: "3.11"  # Python version
    # go: "1.21"  # Go version (uncomment to enable)
    
  # Global npm packages to install
  npm_packages:
    - typescript
    - prettier
    - eslint
    
  # Python packages to install globally
  pip_packages:
    - black
    - pylint
    - requests
    
  # Go packages to install (uncomment to enable)
  # go_packages:
  #   - golang.org/x/tools/gopls@latest

# Custom scripts
scripts:
  # Run after container creation
  post_create: |
    echo "Container created successfully!"
    echo "Custom setup can go here"
    
  # Run before starting the main process
  pre_start: |
    echo "Preparing environment..."
`;
  
  const configPath = path.join(process.cwd(), 'morphbox.yml');
  
  // Check if file already exists
  if (fs.existsSync(configPath)) {
    log.warn('morphbox.yml already exists in this directory');
    console.log('');
    console.log('Would you like to overwrite it? (y/N): ');
    
    // Read user input
    process.stdin.once('data', (data) => {
      const answer = data.toString().trim().toLowerCase();
      if (answer === 'y' || answer === 'yes') {
        fs.writeFileSync(configPath, configContent);
        log.success('morphbox.yml has been overwritten');
        log.info('Edit this file to customize your container configuration');
      } else {
        log.info('Keeping existing morphbox.yml');
      }
      process.exit(0);
    });
  } else {
    fs.writeFileSync(configPath, configContent);
    log.success('Created morphbox.yml in current directory');
    log.info('Edit this file to customize your container configuration');
    log.info('Run "morphbox" to start with your custom configuration');
    process.exit(0);
  }
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
  
  // Check for config flag
  if (args.includes('--config')) {
    generateConfigFile();
    return; // generateConfigFile handles exit
  }

  // Check for list flag
  if (args.includes('--list')) {
    listInstances();
    return;
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
  
  // Track if we're shutting down
  let shuttingDown = false;
  
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
  
  // Handle SIGINT and SIGTERM properly
  process.on('SIGINT', () => {
    if (shuttingDown) {
      // Force exit on second Ctrl+C
      console.log('\n[INFO] Force stopping...');
      process.exit(1);
    }
    shuttingDown = true;
    
    // Forward signal to child and wait for it to exit
    child.kill('SIGINT');
    // Don't exit immediately - let the child cleanup
  });
  
  process.on('SIGTERM', () => {
    if (shuttingDown) return;
    shuttingDown = true;
    child.kill('SIGTERM');
  });
}

// Run main function
main().catch(err => {
  log.error(`Unexpected error: ${err.message}`);
  process.exit(1);
});