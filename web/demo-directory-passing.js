#!/usr/bin/env node

/**
 * Demonstration script showing real MorphBox directory passing
 * This mimics the actual morphbox.js -> morphbox-start-packaged flow
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import path from 'path';
import fs from 'fs';

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

const log = {
  info: (msg) => console.log(`${colors.green}[INFO]${colors.reset} ${msg}`),
  debug: (msg) => console.log(`${colors.blue}[DEBUG]${colors.reset} ${msg}`),
  demo: (msg) => console.log(`${colors.magenta}[DEMO]${colors.reset} ${msg}`)
};

console.log(`${colors.magenta}MorphBox Directory Passing Demonstration${colors.reset}\n`);

// Show current directory
const currentDir = process.cwd();
log.info(`Current working directory: ${currentDir}`);
log.info(`MorphBox installation directory: ${__dirname}`);

// Mimic what morphbox.js does
log.demo('Step 1: morphbox.js sets MORPHBOX_USER_DIR to process.cwd()');
process.env.MORPHBOX_USER_DIR = process.cwd();
log.debug(`MORPHBOX_USER_DIR set to: ${process.env.MORPHBOX_USER_DIR}`);

// Get the morphbox-start script path
const morphboxStart = path.join(__dirname, 'scripts', 'morphbox-start-packaged');
log.demo(`Step 2: morphbox.js prepares to spawn: ${morphboxStart}`);

// Create a demo version that just shows what it receives
const demoScript = `#!/bin/bash
echo "=== MorphBox-Start-Packaged Received ==="
echo "INITIAL_PWD (captured by script): $(pwd)"
echo "MORPHBOX_USER_DIR (from parent): \${MORPHBOX_USER_DIR:-NOT_SET}"
echo "USER_DIR (resolved): \${MORPHBOX_USER_DIR:-$(pwd)}"
echo ""
echo "Docker would mount USER_DIR as /workspace in container"
echo "Container workspace: \${MORPHBOX_USER_DIR:-$(pwd)} -> /workspace"
`;

// Write the demo script
const demoPath = '/tmp/demo-morphbox-start.sh';
fs.writeFileSync(demoPath, demoScript);
fs.chmodSync(demoPath, 0o755);

log.demo('Step 3: morphbox.js spawns morphbox-start-packaged with environment');

// Spawn the demo script like morphbox.js does
const child = spawn(demoPath, ['--demo'], {
  stdio: 'inherit',
  env: process.env  // Pass environment variables including MORPHBOX_USER_DIR
});

child.on('exit', (code) => {
  // Cleanup
  fs.unlinkSync(demoPath);
  
  console.log(`\n${colors.magenta}Summary:${colors.reset}`);
  console.log(`1. morphbox.js captures user's directory: ${currentDir}`);
  console.log(`2. Sets MORPHBOX_USER_DIR environment variable`);
  console.log(`3. Spawns morphbox-start-packaged with environment`);
  console.log(`4. morphbox-start-packaged uses USER_DIR="\${MORPHBOX_USER_DIR:-$INITIAL_PWD}"`);
  console.log(`5. This directory gets mounted as /workspace in Docker container`);
  
  process.exit(code);
});

child.on('error', (err) => {
  console.error(`Error: ${err.message}`);
  process.exit(1);
});