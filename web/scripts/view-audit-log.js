#!/usr/bin/env node

/**
 * MorphBox Audit Log Viewer
 * View and query command history and security events
 * Uses JSON Lines format (no SQLite dependency)
 */

import { readFileSync, existsSync, readdirSync, createReadStream } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  limit: 50,
  type: null,
  risk: null,
  ip: null,
  session: null,
  today: false,
  stats: false,
  follow: false
};

// Parse arguments
for (let i = 0; i < args.length; i++) {
  switch (args[i]) {
    case '--limit':
    case '-l':
      options.limit = parseInt(args[++i], 10);
      break;
    case '--type':
    case '-t':
      options.type = args[++i];
      break;
    case '--risk':
    case '-r':
      options.risk = args[++i];
      break;
    case '--ip':
      options.ip = args[++i];
      break;
    case '--session':
    case '-s':
      options.session = args[++i];
      break;
    case '--today':
      options.today = true;
      break;
    case '--stats':
      options.stats = true;
      break;
    case '--follow':
    case '-f':
      options.follow = true;
      break;
    case '--help':
    case '-h':
      showHelp();
      process.exit(0);
  }
}

function showHelp() {
  console.log(`
MorphBox Audit Log Viewer

Usage: node view-audit-log.js [options]

Options:
  -l, --limit <n>      Number of entries to show (default: 50)
  -t, --type <type>    Filter by type (command, auth, file_access, security)
  -r, --risk <level>   Filter by risk level (low, medium, high, critical)
  --ip <address>       Filter by IP address
  -s, --session <id>   Filter by session ID
  --today              Show only today's entries
  --stats              Show statistics instead of log entries
  -f, --follow         Follow log in real-time (like tail -f)
  -h, --help           Show this help message

Examples:
  # View last 100 commands
  node view-audit-log.js -t command -l 100
  
  # View high-risk commands
  node view-audit-log.js -r high
  
  # View authentication failures
  node view-audit-log.js -t auth | grep FAILED
  
  # Show statistics
  node view-audit-log.js --stats
  
  # Follow log in real-time
  node view-audit-log.js --follow
`);
}

// Setup paths
const logDir = join(dirname(process.cwd()), 'morphbox-audit');
const date = new Date().toISOString().split('T')[0];
const logPath = join(logDir, `audit-${date}.jsonl`);
const statsPath = join(logDir, `stats-${date}.json`);

// Check if audit log exists
if (!existsSync(logDir)) {
  console.error('❌ No audit directory found. The audit log will be created when MorphBox runs.');
  process.exit(1);
}

// Show statistics
if (options.stats) {
  showStatistics();
  process.exit(0);
}

// Follow mode
if (options.follow) {
  followLog();
} else {
  showLog();
}

async function showLog() {
  if (!existsSync(logPath)) {
    console.log('No audit log for today. Run MorphBox to generate logs.');
    return;
  }

  const entries = [];
  const stream = createReadStream(logPath);
  const rl = readline.createInterface({
    input: stream,
    crlfDelay: Infinity
  });

  for await (const line of rl) {
    try {
      const entry = JSON.parse(line);
      
      // Apply filters
      if (options.type && entry.type !== options.type) continue;
      if (options.risk && entry.risk_level !== options.risk) continue;
      if (options.ip && entry.ip !== options.ip) continue;
      if (options.session && entry.sessionId !== options.session) continue;
      
      if (options.today) {
        const entryDate = new Date(entry.timestamp).toISOString().split('T')[0];
        if (entryDate !== date) continue;
      }
      
      entries.push(entry);
    } catch {}
  }

  // Sort by timestamp and apply limit
  entries.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  const limited = entries.slice(-options.limit);
  
  // Display entries
  limited.forEach(formatEntry);
}

function formatEntry(entry) {
  const time = new Date(entry.timestamp).toLocaleTimeString();
  const date = new Date(entry.timestamp).toLocaleDateString();
  
  // Color codes for terminal
  const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    green: '\x1b[32m',
    blue: '\x1b[34m',
    gray: '\x1b[90m',
    bold: '\x1b[1m'
  };

  // Risk level colors
  const riskColors = {
    critical: colors.red + colors.bold,
    high: colors.red,
    medium: colors.yellow,
    low: colors.green
  };

  const riskColor = riskColors[entry.risk_level] || colors.gray;
  const typeColor = entry.type === 'command' ? colors.blue : colors.gray;

  // Format output
  console.log(
    `${colors.gray}[${date} ${time}]${colors.reset} ` +
    `${typeColor}${entry.type.toUpperCase().padEnd(12)}${colors.reset} ` +
    `${riskColor}${(entry.risk_level || 'info').toUpperCase().padEnd(8)}${colors.reset} ` +
    `${colors.gray}${(entry.ip || '-').padEnd(15)}${colors.reset} ` +
    `${entry.action}`
  );

  // Show details if present
  if (entry.details && typeof entry.details === 'object' && Object.keys(entry.details).length > 0) {
    const detailStr = JSON.stringify(entry.details);
    if (detailStr !== '{}') {
      console.log(`${colors.gray}  └─ ${detailStr}${colors.reset}`);
    }
  }
}

function showStatistics() {
  if (!existsSync(statsPath)) {
    console.log('No statistics available yet. Run MorphBox to generate stats.');
    return;
  }

  const stats = JSON.parse(readFileSync(statsPath, 'utf-8'));
  
  // Calculate top commands from log file
  const topCommands = {};
  const highRiskRecent = [];
  
  if (existsSync(logPath)) {
    const lines = readFileSync(logPath, 'utf-8').split('\n').filter(l => l);
    
    lines.forEach(line => {
      try {
        const entry = JSON.parse(line);
        
        // Count commands
        if (entry.type === 'command') {
          const cmdShort = entry.action.substring(0, 50);
          topCommands[cmdShort] = (topCommands[cmdShort] || 0) + 1;
        }
        
        // Track high-risk
        if ((entry.risk_level === 'high' || entry.risk_level === 'critical') && highRiskRecent.length < 5) {
          highRiskRecent.push(entry);
        }
      } catch {}
    });
  }

  const topCommandsList = Object.entries(topCommands)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  console.log('\n📊 MorphBox Audit Statistics\n');
  console.log('═══════════════════════════════════════════');
  console.log(`Total Commands:      ${stats.total_commands}`);
  console.log(`Auth Attempts:       ${stats.total_auth_attempts} (${stats.failed_auth_attempts} failed)`);
  console.log(`High Risk Commands:  ${stats.high_risk_commands}`);
  console.log(`Unique IPs:          ${stats.unique_ips?.length || 0}`);
  console.log(`Unique Sessions:     ${stats.unique_sessions?.length || 0}`);
  console.log(`Last Updated:        ${new Date(stats.last_updated).toLocaleString()}`);
  
  if (topCommandsList.length > 0) {
    console.log('\n📝 Top Commands:');
    console.log('─────────────────────────────────────────');
    topCommandsList.forEach(([cmd, count], i) => {
      console.log(`  ${i + 1}. ${cmd} (${count}x)`);
    });
  }

  if (highRiskRecent.length > 0) {
    console.log('\n⚠️  Recent High-Risk Commands:');
    console.log('─────────────────────────────────────────');
    highRiskRecent.forEach(entry => {
      const time = new Date(entry.timestamp).toLocaleString();
      const cmdText = entry.action.length > 40 ? entry.action.substring(0, 37) + '...' : entry.action;
      console.log(`  ${time} - ${entry.ip || 'unknown'}`);
      console.log(`    ${cmdText}`);
    });
  }
  
  console.log('\n═══════════════════════════════════════════\n');
}

async function followLog() {
  console.log('📡 Following audit log (Ctrl+C to stop)...\n');
  
  if (!existsSync(logPath)) {
    console.log('Waiting for log file to be created...');
  }
  
  let position = 0;
  
  setInterval(() => {
    if (!existsSync(logPath)) return;
    
    const content = readFileSync(logPath, 'utf-8');
    const newContent = content.substring(position);
    
    if (newContent) {
      const lines = newContent.split('\n').filter(l => l);
      lines.forEach(line => {
        try {
          const entry = JSON.parse(line);
          
          // Apply filters
          if (options.type && entry.type !== options.type) return;
          if (options.risk && entry.risk_level !== options.risk) return;
          if (options.ip && entry.ip !== options.ip) return;
          if (options.session && entry.sessionId !== options.session) return;
          
          formatEntry(entry);
        } catch {}
      });
      
      position = content.length;
    }
  }, 1000);
}

// Cleanup
process.on('SIGINT', () => {
  console.log('\nExiting...');
  process.exit(0);
});