import net from 'net';

/**
 * Check if a port is available
 */
export async function isPortAvailable(port: number, host: string = 'localhost'): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    
    server.once('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        resolve(false);
      } else {
        resolve(false);
      }
    });
    
    server.once('listening', () => {
      server.close();
      resolve(true);
    });
    
    server.listen(port, host);
  });
}

/**
 * Find the next available port starting from the given port
 */
export async function findAvailablePort(startPort: number, host: string = 'localhost', maxAttempts: number = 100): Promise<number> {
  let port = startPort;
  let attempts = 0;
  
  while (attempts < maxAttempts) {
    if (await isPortAvailable(port, host)) {
      return port;
    }
    port++;
    attempts++;
  }
  
  throw new Error(`Could not find an available port after ${maxAttempts} attempts starting from port ${startPort}`);
}

/**
 * Get available port with fallback
 */
export async function getAvailablePort(preferredPort: number, host: string = 'localhost'): Promise<number> {
  if (await isPortAvailable(preferredPort, host)) {
    return preferredPort;
  }
  
  console.log(`Port ${preferredPort} is already in use on ${host}, finding next available port...`);
  const availablePort = await findAvailablePort(preferredPort + 1, host);
  console.log(`Using port ${availablePort} instead`);
  
  return availablePort;
}