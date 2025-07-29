#!/usr/bin/env node

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m'
};

console.log('\n' + '='.repeat(60));
console.log(`${colors.green}🎉 MorphBox installed successfully!${colors.reset}`);
console.log('='.repeat(60) + '\n');

console.log(`${colors.magenta}Quick Start:${colors.reset}`);
console.log(`  ${colors.blue}morphbox              ${colors.reset}# Start web interface`);
console.log(`  ${colors.blue}morphbox --terminal   ${colors.reset}# Start terminal mode`);
console.log(`  ${colors.blue}morphbox --help       ${colors.reset}# Show all options`);

console.log('\n' + '='.repeat(60) + '\n');