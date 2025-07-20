#!/usr/bin/env node

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const LOG_FILE = join(process.cwd(), 'logs', 'browser-logs.jsonl');

// Parse command line arguments
const args = process.argv.slice(2);
const filterLevel = args.find(arg => ['info', 'error', 'warn', 'debug'].includes(arg));
const searchTerm = args.find(arg => !['info', 'error', 'warn', 'debug'].includes(arg));
const showHelp = args.includes('--help') || args.includes('-h');

if (showHelp) {
  console.log(`
Browser Log Viewer

Usage: node view-logs.js [level] [search-term]

Options:
  level        Filter by log level (info, error, warn, debug)
  search-term  Search for specific text in log messages

Examples:
  node view-logs.js                  # Show all logs
  node view-logs.js error            # Show only errors
  node view-logs.js Terminal         # Search for "Terminal" in messages
  node view-logs.js error WebSocket  # Show errors containing "WebSocket"
`);
  process.exit(0);
}

if (!existsSync(LOG_FILE)) {
  console.log('No log file found at:', LOG_FILE);
  console.log('Logs will be created when the browser sends them.');
  process.exit(0);
}

try {
  const content = readFileSync(LOG_FILE, 'utf-8');
  const lines = content.trim().split('\n').filter(line => line);
  
  console.log(`\nBrowser Logs (${lines.length} entries)\n${'='.repeat(80)}\n`);
  
  let displayedCount = 0;
  
  lines.forEach(line => {
    try {
      const log = JSON.parse(line);
      
      // Apply filters
      if (filterLevel && log.level !== filterLevel) return;
      if (searchTerm && !log.message.toLowerCase().includes(searchTerm.toLowerCase())) return;
      
      // Format timestamp
      const timestamp = new Date(log.timestamp).toLocaleString();
      
      // Color code by level
      const levelColors = {
        error: '\x1b[31m', // Red
        warn: '\x1b[33m',  // Yellow
        info: '\x1b[36m',  // Cyan
        debug: '\x1b[90m'  // Gray
      };
      const reset = '\x1b[0m';
      const color = levelColors[log.level] || '';
      
      // Format output
      console.log(`${color}[${log.level.toUpperCase()}]${reset} ${timestamp}`);
      console.log(`URL: ${log.browserInfo.url}`);
      console.log(`Message: ${log.message}`);
      
      if (log.data) {
        console.log('Data:', JSON.stringify(log.data, null, 2));
      }
      
      console.log(`Viewport: ${log.browserInfo.viewport.width}x${log.browserInfo.viewport.height}`);
      console.log(`${'-'.repeat(80)}\n`);
      
      displayedCount++;
    } catch (e) {
      console.error('Failed to parse log line:', e.message);
    }
  });
  
  console.log(`Displayed ${displayedCount} of ${lines.length} total entries`);
  
  if (filterLevel || searchTerm) {
    console.log(`\nFilters applied:`);
    if (filterLevel) console.log(`  - Level: ${filterLevel}`);
    if (searchTerm) console.log(`  - Search: "${searchTerm}"`);
  }
  
} catch (error) {
  console.error('Error reading log file:', error.message);
  process.exit(1);
}