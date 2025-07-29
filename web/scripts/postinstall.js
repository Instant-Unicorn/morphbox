#!/usr/bin/env node

import { execSync } from 'child_process';
import { homedir } from 'os';
import { existsSync, appendFileSync, readFileSync } from 'fs';
import { join } from 'path';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function setupPath() {
  try {
    // Get npm prefix
    const npmPrefix = execSync('npm config get prefix', { encoding: 'utf8' }).trim();
    const npmBinPath = join(npmPrefix, 'bin');
    
    // Check if morphbox is accessible
    try {
      execSync('which morphbox', { stdio: 'ignore' });
      log('✅ morphbox is already in your PATH!', 'green');
      return;
    } catch {
      // morphbox not in PATH, continue setup
    }
    
    // Detect shell
    const shell = process.env.SHELL || '/bin/bash';
    const home = homedir();
    let rcFile = '';
    
    if (shell.includes('zsh')) {
      rcFile = join(home, '.zshrc');
    } else if (shell.includes('bash')) {
      rcFile = join(home, '.bashrc');
    } else if (shell.includes('fish')) {
      rcFile = join(home, '.config', 'fish', 'config.fish');
    } else {
      log(`⚠️  Unknown shell: ${shell}`, 'yellow');
      log(`Please add this to your shell configuration:`, 'yellow');
      log(`export PATH="${npmBinPath}:$PATH"`, 'blue');
      return;
    }
    
    // Check if PATH entry already exists
    if (existsSync(rcFile)) {
      const content = readFileSync(rcFile, 'utf8');
      if (content.includes(npmBinPath)) {
        log('✅ PATH entry already exists in ' + rcFile, 'green');
        return;
      }
    }
    
    // Add to PATH
    const pathEntry = shell.includes('fish') 
      ? `\n# Added by morphbox\nset -gx PATH ${npmBinPath} $PATH\n`
      : `\n# Added by morphbox\nexport PATH="${npmBinPath}:$PATH"\n`;
    
    appendFileSync(rcFile, pathEntry);
    log(`✅ Added morphbox to PATH in ${rcFile}`, 'green');
    
    log('\n📝 To use morphbox immediately, run:', 'magenta');
    log(`source ${rcFile}`, 'blue');
    log('\nOr start a new terminal session.', 'yellow');
    
  } catch (error) {
    log('⚠️  Could not automatically configure PATH', 'yellow');
    log('Please add your npm global bin directory to PATH manually.', 'yellow');
    console.error(error.message);
  }
}

function showPostInstallMessage() {
  console.log('\n' + '='.repeat(60));
  log('🎉 MorphBox installed successfully!', 'green');
  console.log('='.repeat(60) + '\n');
  
  log('Quick Start:', 'magenta');
  log('  morphbox              # Start web interface', 'blue');
  log('  morphbox --terminal   # Start terminal mode', 'blue');
  log('  morphbox --help       # Show all options', 'blue');
  
  console.log('\n' + '='.repeat(60) + '\n');
}

// Main
if (process.env.npm_config_global === 'true' || process.env.npm_lifecycle_event === 'postinstall') {
  setupPath();
  showPostInstallMessage();
}