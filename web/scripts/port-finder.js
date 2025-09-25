#!/usr/bin/env node

/**
 * Port finder utility for MorphBox
 * Finds available port pairs for web and websocket servers
 */

import net from 'net';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_WEB_PORT = 8008;
const BASE_WS_PORT = 8009;
const MAX_PORT_ATTEMPTS = 20; // Try up to 20 port pairs
const INSTANCES_FILE = '/tmp/morphbox-instances.json';

/**
 * Check if a port is available on a specific host
 * @param {number} port - Port to check
 * @param {string} host - Host to bind to
 * @returns {Promise<boolean>} - true if port is available
 */
function isPortAvailable(port, host) {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        resolve(false);
      } else {
        // Unexpected error, treat as unavailable
        resolve(false);
      }
    });

    server.once('listening', () => {
      server.close(() => {
        resolve(true);
      });
    });

    // Convert localhost to 127.0.0.1 for proper binding
    const bindHost = host === 'localhost' ? '127.0.0.1' : host;
    server.listen(port, bindHost);
  });
}

/**
 * Load existing instances from tracking file
 * @returns {Array} - Array of instance objects
 */
function loadInstances() {
  try {
    if (fs.existsSync(INSTANCES_FILE)) {
      const data = fs.readFileSync(INSTANCES_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (e) {
    // Ignore errors, start fresh
  }
  return [];
}

/**
 * Clean up stale instances (where PID no longer exists)
 * @param {Array} instances - Array of instance objects
 * @returns {Array} - Cleaned array
 */
function cleanupStaleInstances(instances) {
  return instances.filter(instance => {
    try {
      // Check if process exists by sending signal 0
      process.kill(instance.webPid, 0);
      return true;
    } catch (e) {
      // Process doesn't exist
      return false;
    }
  });
}

/**
 * Save instances to tracking file
 * @param {Array} instances - Array of instance objects
 */
function saveInstances(instances) {
  try {
    fs.writeFileSync(INSTANCES_FILE, JSON.stringify(instances, null, 2));
  } catch (e) {
    // Ignore save errors
  }
}

/**
 * Find available port pair
 * @param {string} host - Host to bind to (localhost, 0.0.0.0, or specific IP)
 * @returns {Promise<{webPort: number, wsPort: number}>}
 */
async function findAvailablePorts(host = 'localhost') {
  // Load and clean existing instances
  let instances = loadInstances();
  instances = cleanupStaleInstances(instances);
  saveInstances(instances);

  // Try port pairs starting from base
  for (let i = 0; i < MAX_PORT_ATTEMPTS; i++) {
    const webPort = BASE_WEB_PORT + (i * 2);
    const wsPort = BASE_WS_PORT + (i * 2);

    // Check if both ports are available
    const webAvailable = await isPortAvailable(webPort, host);
    const wsAvailable = await isPortAvailable(wsPort, host);

    if (webAvailable && wsAvailable) {
      console.error(`[Port Finder] Found available ports: ${webPort} (web), ${wsPort} (websocket)`);
      return { webPort, wsPort };
    }
  }

  throw new Error('No available port pairs found after ' + MAX_PORT_ATTEMPTS + ' attempts');
}

/**
 * Register a new instance
 * @param {number} webPort - Web server port
 * @param {number} wsPort - WebSocket server port
 * @param {number} webPid - Web server PID
 * @param {number} wsPid - WebSocket server PID
 * @param {string} workspace - Working directory
 * @param {string} host - Bind host
 */
function registerInstance(webPort, wsPort, webPid, wsPid, workspace, host) {
  let instances = loadInstances();
  instances = cleanupStaleInstances(instances);

  // Add new instance
  instances.push({
    webPort,
    wsPort,
    webPid,
    wsPid,
    workspace,
    host,
    startTime: new Date().toISOString()
  });

  saveInstances(instances);
}

/**
 * Unregister an instance
 * @param {number} webPort - Web server port to identify instance
 */
function unregisterInstance(webPort) {
  let instances = loadInstances();
  instances = instances.filter(inst => inst.webPort !== webPort);
  saveInstances(instances);
}

/**
 * List all running instances
 */
function listInstances() {
  let instances = loadInstances();
  instances = cleanupStaleInstances(instances);
  saveInstances(instances);

  if (instances.length === 0) {
    console.log('No MorphBox instances are currently running.');
    return;
  }

  console.log('Running MorphBox instances:');
  console.log('─'.repeat(80));
  console.log('Port  | WebSocket | Workspace                              | Host        | Uptime');
  console.log('─'.repeat(80));

  instances.forEach(inst => {
    const uptime = getUptime(inst.startTime);
    const workspace = inst.workspace.length > 38
      ? '...' + inst.workspace.slice(-35)
      : inst.workspace.padEnd(38);

    console.log(
      `${inst.webPort.toString().padEnd(5)} | ` +
      `${inst.wsPort.toString().padEnd(9)} | ` +
      `${workspace} | ` +
      `${inst.host.padEnd(11)} | ` +
      `${uptime}`
    );
  });
  console.log('─'.repeat(80));
  console.log(`Total instances: ${instances.length}`);
}

/**
 * Calculate uptime from start time
 * @param {string} startTime - ISO date string
 * @returns {string} - Human-readable uptime
 */
function getUptime(startTime) {
  const start = new Date(startTime);
  const now = new Date();
  const seconds = Math.floor((now - start) / 1000);

  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ${minutes % 60}m`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}

// CLI interface
if (process.argv[1] === __filename) {
  const command = process.argv[2];
  const host = process.argv[3] || 'localhost';

  switch (command) {
    case 'find':
      findAvailablePorts(host)
        .then(ports => {
          // Output JSON for script consumption
          console.log(JSON.stringify(ports));
        })
        .catch(err => {
          console.error('[Port Finder] Error:', err.message);
          process.exit(1);
        });
      break;

    case 'register':
      const webPort = parseInt(process.argv[3]);
      const wsPort = parseInt(process.argv[4]);
      const webPid = parseInt(process.argv[5]);
      const wsPid = parseInt(process.argv[6]);
      const workspace = process.argv[7];
      const bindHost = process.argv[8];
      registerInstance(webPort, wsPort, webPid, wsPid, workspace, bindHost);
      break;

    case 'unregister':
      const port = parseInt(process.argv[3]);
      unregisterInstance(port);
      break;

    case 'list':
      listInstances();
      break;

    default:
      console.log('Usage:');
      console.log('  port-finder.js find [host]                       - Find available ports');
      console.log('  port-finder.js register <web> <ws> <wpid> <wspid> <workspace> <host> - Register instance');
      console.log('  port-finder.js unregister <webPort>              - Unregister instance');
      console.log('  port-finder.js list                              - List all instances');
      process.exit(1);
  }
}

export { findAvailablePorts, registerInstance, unregisterInstance, listInstances };