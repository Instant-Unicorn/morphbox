#!/usr/bin/env node

/**
 * Port finder utility for MorphBox
 * Finds available port pairs for web and websocket servers
 */

import net from 'net';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

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
    console.error('[Port Finder] Error loading instances:', e.message);
  }
  return [];
}

/**
 * Save instance information
 * @param {Object} instance - Instance information
 */
export function saveInstance(instance) {
  try {
    let instances = loadInstances();

    // Remove any existing instance with same ports
    instances = instances.filter(i =>
      i.webPort !== instance.webPort || i.wsPort !== instance.wsPort
    );

    // Add new instance
    instances.push({
      ...instance,
      timestamp: new Date().toISOString()
    });

    // Save to file
    fs.writeFileSync(INSTANCES_FILE, JSON.stringify(instances, null, 2));
  } catch (e) {
    console.error('[Port Finder] Error saving instance:', e.message);
  }
}

/**
 * Remove instance from tracking
 * @param {number} webPort - Web server port
 */
export function removeInstance(webPort) {
  try {
    let instances = loadInstances();
    instances = instances.filter(i => i.webPort !== webPort);
    fs.writeFileSync(INSTANCES_FILE, JSON.stringify(instances, null, 2));
  } catch (e) {
    console.error('[Port Finder] Error removing instance:', e.message);
  }
}

/**
 * Clean up stale instances (where process is no longer running)
 */
function cleanupStaleInstances() {
  try {
    let instances = loadInstances();
    const activeInstances = [];

    for (const instance of instances) {
      if (instance.pid) {
        try {
          // Check if process is still running (works on Unix-like systems)
          process.kill(instance.pid, 0);
          activeInstances.push(instance);
        } catch (e) {
          // Process doesn't exist, don't include in active list
          console.log(`[Port Finder] Removing stale instance on ports ${instance.webPort}/${instance.wsPort}`);
        }
      } else {
        // No PID, keep it (might be from older version)
        activeInstances.push(instance);
      }
    }

    if (activeInstances.length !== instances.length) {
      fs.writeFileSync(INSTANCES_FILE, JSON.stringify(activeInstances, null, 2));
    }
  } catch (e) {
    console.error('[Port Finder] Error cleaning up instances:', e.message);
  }
}

/**
 * Find available port pair
 * @param {string} host - Host to bind to
 * @returns {Promise<Object>} - Object with webPort and wsPort
 */
export async function findAvailablePorts(host = 'localhost') {
  // Clean up stale instances first
  cleanupStaleInstances();

  // Check if environment variables specify ports
  if (process.env.MORPHBOX_WEB_PORT && process.env.MORPHBOX_WS_PORT) {
    const webPort = parseInt(process.env.MORPHBOX_WEB_PORT);
    const wsPort = parseInt(process.env.MORPHBOX_WS_PORT);

    const webAvailable = await isPortAvailable(webPort, host);
    const wsAvailable = await isPortAvailable(wsPort, host);

    if (webAvailable && wsAvailable) {
      return { webPort, wsPort };
    } else {
      console.error(`[Port Finder] Requested ports ${webPort}/${wsPort} are not available`);
      process.exit(1);
    }
  }

  // Try to find available port pair
  for (let i = 0; i < MAX_PORT_ATTEMPTS; i++) {
    const webPort = BASE_WEB_PORT + (i * 2);
    const wsPort = BASE_WS_PORT + (i * 2);

    const webAvailable = await isPortAvailable(webPort, host);
    const wsAvailable = await isPortAvailable(wsPort, host);

    if (webAvailable && wsAvailable) {
      console.log(`[Port Finder] Found available ports: ${webPort} (web), ${wsPort} (websocket)`);
      return { webPort, wsPort };
    } else {
      if (!webAvailable) {
        console.log(`[Port Finder] Port ${webPort} is in use`);
      }
      if (!wsAvailable) {
        console.log(`[Port Finder] Port ${wsPort} is in use`);
      }
    }
  }

  throw new Error(`Could not find available ports after ${MAX_PORT_ATTEMPTS} attempts`);
}

/**
 * List all running instances
 * @returns {Array} - Array of instance objects
 */
export function listInstances() {
  cleanupStaleInstances();
  return loadInstances();
}

// If run directly from command line
if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2];
  const host = process.argv[3] || 'localhost';

  if (command === 'find') {
    findAvailablePorts(host)
      .then(ports => {
        console.log(JSON.stringify(ports));
      })
      .catch(err => {
        console.error('[Port Finder] Error:', err.message);
        process.exit(1);
      });
  } else if (command === 'list') {
    const instances = listInstances();
    console.log(JSON.stringify(instances, null, 2));
  } else {
    console.log('Usage: port-finder.js [find|list] [host]');
    process.exit(1);
  }
}