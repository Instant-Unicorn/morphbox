#!/usr/bin/env node

const { spawn, execSync } = require('child_process');
const https = require('https');
const fs = require('fs');
const path = require('path');
const os = require('os');

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

// Banner
function showBanner() {
  console.log(`
${colors.magenta}
 __  __                 _     ____            
|  \\/  | ___  _ __ _ __| |__ | __ )  _____  __
| |\\/| |/ _ \\| '__| '_ \\ '_ \\|  _ \\ / _ \\ \\/ /
| |  | | (_) | |  | |_) | | | | |_) | (_) >  < 
|_|  |_|\\___/|_|  | .__/|_| |_|____/ \\___/_/\\_\\
                  |_|                           
${colors.reset}
${colors.blue}MorphBox Installer v2.0 - Docker-based AI Sandbox${colors.reset}
`);
}

// Check OS compatibility
function checkOS() {
  const platform = os.platform();
  
  switch (platform) {
    case 'darwin':
      log.info('Detected OS: macOS');
      return 'macos';
    case 'linux':
      log.info('Detected OS: Linux');
      return 'linux';
    case 'win32':
      log.info('Detected OS: Windows');
      return 'windows';
    default:
      throw new Error(`Unsupported operating system: ${platform}`);
  }
}

// Check if running as root
function checkPrivileges() {
  if (process.platform !== 'win32' && process.getuid() === 0) {
    throw new Error('This installer should not be run as root. Please run as a regular user.');
  }
}

// Check Docker installation
function checkDocker() {
  try {
    const version = execSync('docker --version', { encoding: 'utf8' });
    log.success(`Docker installed: ${version.trim()}`);
    
    // Check if Docker daemon is running
    try {
      execSync('docker ps', { stdio: 'ignore' });
      log.success('Docker daemon is running');
    } catch (e) {
      throw new Error('Docker daemon is not running. Please start Docker.');
    }
  } catch (e) {
    throw new Error('Docker is not installed. Please install Docker first: https://docs.docker.com/get-docker/');
  }
}

// Check git installation
function checkGit() {
  try {
    const version = execSync('git --version', { encoding: 'utf8' });
    log.success(`Git installed: ${version.trim()}`);
  } catch (e) {
    throw new Error('Git is not installed. Please install Git first.');
  }
}

// Clone or update MorphBox repository
async function setupMorphBox() {
  const morphboxHome = path.join(os.homedir(), '.morphbox');
  
  if (fs.existsSync(morphboxHome)) {
    log.info('MorphBox directory exists, updating...');
    
    try {
      process.chdir(morphboxHome);
      execSync('git fetch origin', { stdio: 'inherit' });
      
      // Check current branch
      const currentBranch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
      
      // Pull latest changes
      execSync(`git pull origin ${currentBranch}`, { stdio: 'inherit' });
      
      log.success('MorphBox updated successfully');
    } catch (e) {
      log.warn('Failed to update MorphBox, continuing with existing version');
    }
  } else {
    log.info('Installing MorphBox...');
    
    try {
      execSync(`git clone https://github.com/MicahBly/morphbox.git "${morphboxHome}"`, { 
        stdio: 'inherit' 
      });
      
      log.success('MorphBox repository cloned successfully');
    } catch (e) {
      throw new Error(`Failed to clone MorphBox repository: ${e.message}`);
    }
  }
  
  return morphboxHome;
}

// Create global morphbox command
function createGlobalCommand(morphboxHome) {
  const binDir = path.join(os.homedir(), '.local', 'bin');
  
  // Create ~/.local/bin if it doesn't exist
  if (!fs.existsSync(binDir)) {
    fs.mkdirSync(binDir, { recursive: true });
  }
  
  const morphboxCommand = path.join(binDir, 'morphbox');
  const morphboxScript = `#!/bin/bash
# Global MorphBox launcher
MORPHBOX_HOME="${morphboxHome}"

# Check if morphbox-start exists
if [[ ! -f "$MORPHBOX_HOME/morphbox-start" ]]; then
    echo "Error: MorphBox installation is incomplete"
    echo "Please run: morphbox-installer"
    exit 1
fi

# Run morphbox-start with all arguments
cd "$MORPHBOX_HOME"
exec ./morphbox-start "$@"
`;
  
  // Write the script
  fs.writeFileSync(morphboxCommand, morphboxScript);
  fs.chmodSync(morphboxCommand, '755');
  
  log.success(`Created morphbox command at ${morphboxCommand}`);
  
  // Check if ~/.local/bin is in PATH
  const pathEnv = process.env.PATH || '';
  if (!pathEnv.includes(binDir)) {
    log.warn(`Add ${binDir} to your PATH to use 'morphbox' command globally`);
    
    const shellConfig = process.env.SHELL?.includes('zsh') ? '~/.zshrc' : '~/.bashrc';
    log.info(`Add this line to your ${shellConfig}:`);
    console.log(`\n  export PATH="$HOME/.local/bin:$PATH"\n`);
    log.info('Then reload your shell or run: source ' + shellConfig);
  }
  
  return morphboxCommand;
}

// Setup Docker container
async function setupDockerContainer(morphboxHome) {
  log.info('Setting up Docker container...');
  
  process.chdir(morphboxHome);
  
  // Check if docker-compose.yml exists
  if (!fs.existsSync('docker-compose.yml')) {
    throw new Error('docker-compose.yml not found in MorphBox directory');
  }
  
  try {
    // Pull the Docker image
    log.info('Pulling MorphBox Docker image...');
    execSync('docker compose pull', { stdio: 'inherit' });
    
    // Build if needed
    log.info('Building Docker container...');
    execSync('docker compose build', { stdio: 'inherit' });
    
    log.success('Docker container setup complete');
  } catch (e) {
    log.warn('Failed to setup Docker container, but you can do this later');
  }
}

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    dryRun: false,
    help: false
  };
  
  for (const arg of args) {
    switch (arg) {
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--help':
      case '-h':
        options.help = true;
        break;
    }
  }
  
  return options;
}

// Show help
function showHelp() {
  console.log(`
Usage: morphbox-installer [OPTIONS]

Options:
  --help      Show this help message
  --dry-run   Check requirements without installing

Examples:
  morphbox-installer              # Install MorphBox
  morphbox-installer --dry-run    # Check if installation would work

After installation, run:
  morphbox              # Start MorphBox web interface
  morphbox --terminal   # Start Claude in terminal mode
  morphbox --help       # Show all options

For more information, visit: https://github.com/MicahBly/morphbox
`);
}

// Main installer function
async function main() {
  const options = parseArgs();
  
  if (options.help) {
    showHelp();
    process.exit(0);
  }
  
  showBanner();
  
  try {
    // Check requirements
    checkPrivileges();
    const osType = checkOS();
    checkDocker();
    checkGit();
    
    if (options.dryRun) {
      log.success('Dry run complete. System requirements met.');
      log.info('Run without --dry-run to install MorphBox.');
      process.exit(0);
    }
    
    // Setup MorphBox
    const morphboxHome = await setupMorphBox();
    
    // Create global command
    const morphboxCommand = createGlobalCommand(morphboxHome);
    
    // Setup Docker container
    await setupDockerContainer(morphboxHome);
    
    // Success message
    console.log('\n' + colors.green + '═'.repeat(50) + colors.reset);
    log.success('MorphBox installed successfully!');
    console.log(colors.green + '═'.repeat(50) + colors.reset + '\n');
    
    console.log('To get started:');
    
    // Check if morphbox is in PATH
    const pathEnv = process.env.PATH || '';
    const binDir = path.join(os.homedir(), '.local', 'bin');
    
    if (pathEnv.includes(binDir)) {
      console.log(`  ${colors.blue}morphbox${colors.reset}              # Start MorphBox web interface`);
      console.log(`  ${colors.blue}morphbox --terminal${colors.reset}   # Start Claude in terminal mode`);
      console.log(`  ${colors.blue}morphbox --help${colors.reset}       # Show all options\n`);
    } else {
      console.log(`  ${colors.blue}~/.local/bin/morphbox${colors.reset}              # Start MorphBox web interface`);
      console.log(`  ${colors.blue}~/.local/bin/morphbox --terminal${colors.reset}   # Start Claude in terminal mode`);
      console.log(`  ${colors.blue}~/.local/bin/morphbox --help${colors.reset}       # Show all options\n`);
      
      console.log(`Or add ~/.local/bin to your PATH first (see instructions above)\n`);
    }
    
  } catch (error) {
    log.error(error.message);
    console.log('\nFor help, visit: https://github.com/MicahBly/morphbox');
    process.exit(1);
  }
}

// Run the installer
if (require.main === module) {
  main();
}