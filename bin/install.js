#!/usr/bin/env node

const { spawn } = require('child_process');
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
${colors.blue}MorphBox Installer - Safe AI Sandbox for Development${colors.reset}
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

// Download installer script
function downloadInstaller() {
  return new Promise((resolve, reject) => {
    const installerUrl = 'https://raw.githubusercontent.com/morphbox/morphbox/main/install.sh';
    const tempPath = path.join(os.tmpdir(), 'morphbox-install.sh');
    
    log.info('Downloading MorphBox installer...');
    
    const file = fs.createWriteStream(tempPath);
    
    https.get(installerUrl, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download installer: ${response.statusCode}`));
        return;
      }
      
      response.pipe(file);
      
      file.on('finish', () => {
        file.close(() => {
          fs.chmodSync(tempPath, '755');
          resolve(tempPath);
        });
      });
    }).on('error', (err) => {
      fs.unlink(tempPath, () => {});
      reject(err);
    });
  });
}

// Run the bash installer
function runInstaller(scriptPath) {
  return new Promise((resolve, reject) => {
    log.info('Running MorphBox installer...\n');
    
    const installer = spawn('bash', [scriptPath], {
      stdio: 'inherit',
      env: { ...process.env }
    });
    
    installer.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Installer exited with code ${code}`));
      }
    });
    
    installer.on('error', (err) => {
      reject(err);
    });
  });
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
Usage: npx @morphbox/installer [OPTIONS]

Options:
  --help      Show this help message
  --dry-run   Check requirements without installing

Examples:
  npx @morphbox/installer              # Install MorphBox
  npx @morphbox/installer --dry-run    # Check if installation would work

For more information, visit: https://morphbox.iu.dev
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
    
    if (options.dryRun) {
      log.success('Dry run complete. System requirements met.');
      log.info('Run without --dry-run to install MorphBox.');
      process.exit(0);
    }
    
    // For Windows, show special instructions
    if (osType === 'windows') {
      log.warn('Windows detected. MorphBox on Windows requires WSL2.');
      log.info('Please ensure WSL2 is installed and enabled.');
      log.info('Visit https://morphbox.iu.dev/docs/windows for detailed instructions.');
      console.log('\nWould you like to continue? (This will set up MorphBox in WSL2)');
      // In a real implementation, we'd wait for user input here
    }
    
    // Download and run installer
    const installerPath = await downloadInstaller();
    await runInstaller(installerPath);
    
    // Cleanup
    fs.unlinkSync(installerPath);
    
    // Success message
    console.log('\n' + colors.green + '═'.repeat(50) + colors.reset);
    log.success('MorphBox installed successfully!');
    console.log(colors.green + '═'.repeat(50) + colors.reset + '\n');
    
    console.log('To get started, run:');
    console.log(`  ${colors.blue}morphbox --help${colors.reset}\n`);
    console.log('First run may take up to 3 minutes to download and configure the VM.');
    console.log('Subsequent runs will start in under 10 seconds.\n');
    
  } catch (error) {
    log.error(error.message);
    console.log('\nFor help, visit: https://morphbox.iu.dev/docs/troubleshooting');
    process.exit(1);
  }
}

// Run the installer
if (require.main === module) {
  main();
}