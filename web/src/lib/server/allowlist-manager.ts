/**
 * Allowlist Manager - Manages IP and website access control
 * Reads from morphbox-allowlist.conf file
 */

import { readFileSync, watchFile, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import net from 'net';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface AllowlistConfig {
  ipAllowlist: string[];
  websiteAllowlist: string[];
  portsAllowlist: string[];
}

class AllowlistManager {
  private config: AllowlistConfig = {
    ipAllowlist: ['0.0.0.0/0'],  // Allow all by default
    websiteAllowlist: [],
    portsAllowlist: []
  };
  
  private configPath: string;
  private fileWatcher: any = null;
  private ipNets: Array<{network: string, mask: number}> = [];

  constructor() {
    // Look for config file in multiple locations
    const possiblePaths = [
      join(process.cwd(), 'morphbox-allowlist.conf'),
      join(dirname(process.cwd()), 'morphbox-allowlist.conf'),
      join(__dirname, '../../../../morphbox-allowlist.conf'),
      '/etc/morphbox/allowlist.conf'
    ];

    this.configPath = possiblePaths.find(p => existsSync(p)) || possiblePaths[0];
    this.loadConfig();
    this.watchConfig();
  }

  private loadConfig(): void {
    try {
      if (!existsSync(this.configPath)) {
        console.log('[AllowlistManager] No config file found, using defaults');
        return;
      }

      const content = readFileSync(this.configPath, 'utf-8');
      const lines = content.split('\n');
      let currentSection = '';
      
      const newConfig: AllowlistConfig = {
        ipAllowlist: [],
        websiteAllowlist: [],
        portsAllowlist: []
      };

      for (const line of lines) {
        const trimmed = line.trim();
        
        // Skip comments and empty lines
        if (!trimmed || trimmed.startsWith('#')) continue;
        
        // Check for section headers
        if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
          currentSection = trimmed.slice(1, -1).toLowerCase();
          continue;
        }

        // Add to appropriate section
        switch (currentSection) {
          case 'ip_allowlist':
            newConfig.ipAllowlist.push(trimmed);
            break;
          case 'website_allowlist':
            newConfig.websiteAllowlist.push(trimmed);
            break;
          case 'ports_allowlist':
            newConfig.portsAllowlist.push(trimmed);
            break;
        }
      }

      // Use new config if it has values, otherwise keep defaults
      if (newConfig.ipAllowlist.length > 0) {
        this.config.ipAllowlist = newConfig.ipAllowlist;
      }
      if (newConfig.websiteAllowlist.length > 0) {
        this.config.websiteAllowlist = newConfig.websiteAllowlist;
      }
      if (newConfig.portsAllowlist.length > 0) {
        this.config.portsAllowlist = newConfig.portsAllowlist;
      }

      // Parse IP networks for efficient checking
      this.parseIPNetworks();

      console.log('[AllowlistManager] Loaded config:', {
        ips: this.config.ipAllowlist.length,
        websites: this.config.websiteAllowlist.length,
        ports: this.config.portsAllowlist.length
      });

    } catch (error) {
      console.error('[AllowlistManager] Error loading config:', error);
    }
  }

  private parseIPNetworks(): void {
    this.ipNets = [];
    
    for (const entry of this.config.ipAllowlist) {
      if (entry.includes('/')) {
        // CIDR notation
        const [network, maskStr] = entry.split('/');
        const mask = parseInt(maskStr, 10);
        this.ipNets.push({ network, mask });
      } else {
        // Single IP (treat as /32 for IPv4 or /128 for IPv6)
        const mask = entry.includes(':') ? 128 : 32;
        this.ipNets.push({ network: entry, mask });
      }
    }
  }

  private watchConfig(): void {
    if (!existsSync(this.configPath)) return;

    // Watch for config file changes
    watchFile(this.configPath, { interval: 5000 }, () => {
      console.log('[AllowlistManager] Config file changed, reloading...');
      this.loadConfig();
    });
  }

  /**
   * Check if an IP address is allowed
   */
  isIPAllowed(ip: string): boolean {
    // If allowlist includes 0.0.0.0/0 or ::0/0, allow all
    if (this.config.ipAllowlist.includes('0.0.0.0/0') || 
        this.config.ipAllowlist.includes('::0/0')) {
      return true;
    }

    // Normalize IPv6 addresses
    const normalizedIP = this.normalizeIP(ip);

    // Check against each allowed network
    for (const { network, mask } of this.ipNets) {
      if (this.isIPInNetwork(normalizedIP, network, mask)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if a website/domain is allowed
   */
  isWebsiteAllowed(url: string): boolean {
    // Extract domain from URL
    let domain = url;
    try {
      if (url.startsWith('http://') || url.startsWith('https://')) {
        const urlObj = new URL(url);
        domain = urlObj.hostname;
      }
    } catch {}

    // Remove www. prefix for comparison
    domain = domain.replace(/^www\./, '');

    // Check exact match or subdomain match
    for (const allowed of this.config.websiteAllowlist) {
      const allowedDomain = allowed.replace(/^www\./, '');
      
      // Exact match or subdomain
      if (domain === allowedDomain || domain.endsWith('.' + allowedDomain)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if a port is allowed (if port restrictions are configured)
   */
  isPortAllowed(port: number): boolean {
    // If no port restrictions, allow all
    if (this.config.portsAllowlist.length === 0) {
      return true;
    }

    for (const entry of this.config.portsAllowlist) {
      if (entry.includes('-')) {
        // Port range
        const [start, end] = entry.split('-').map(p => parseInt(p, 10));
        if (port >= start && port <= end) {
          return true;
        }
      } else {
        // Single port
        if (port === parseInt(entry, 10)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Get all allowed websites (for Docker configuration)
   */
  getAllowedWebsites(): string[] {
    return [...this.config.websiteAllowlist];
  }

  /**
   * Get allowed IPs for display/debugging
   */
  getAllowedIPs(): string[] {
    return [...this.config.ipAllowlist];
  }

  /**
   * Normalize IP address (handle IPv6 variations)
   */
  private normalizeIP(ip: string): string {
    // Remove IPv6 IPv4-mapped prefix
    if (ip.startsWith('::ffff:')) {
      return ip.substring(7);
    }
    return ip;
  }

  /**
   * Check if IP is in network (simplified, production should use proper IP library)
   */
  private isIPInNetwork(ip: string, network: string, mask: number): boolean {
    // Handle 0.0.0.0/0 (allow all IPv4)
    if (network === '0.0.0.0' && mask === 0) {
      return !ip.includes(':');  // Is IPv4
    }

    // Handle ::/0 (allow all IPv6)  
    if (network === '::' && mask === 0) {
      return ip.includes(':');  // Is IPv6
    }

    // For exact match (common case)
    if ((mask === 32 && !ip.includes(':')) || (mask === 128 && ip.includes(':'))) {
      return ip === network;
    }

    // For actual subnet matching, we'd need a proper IP library
    // This is a simplified version that handles common cases
    if (!ip.includes(':') && !network.includes(':')) {
      // IPv4 subnet matching (simplified)
      const ipParts = ip.split('.').map(p => parseInt(p, 10));
      const netParts = network.split('.').map(p => parseInt(p, 10));
      
      if (ipParts.length !== 4 || netParts.length !== 4) return false;

      const ipNum = (ipParts[0] << 24) | (ipParts[1] << 16) | (ipParts[2] << 8) | ipParts[3];
      const netNum = (netParts[0] << 24) | (netParts[1] << 16) | (netParts[2] << 8) | netParts[3];
      const maskNum = (0xFFFFFFFF << (32 - mask)) >>> 0;

      return (ipNum & maskNum) === (netNum & maskNum);
    }

    // For complex IPv6 matching, we'd need a library
    // For now, just do exact match
    return ip === network;
  }

  /**
   * Reload configuration manually
   */
  reload(): void {
    this.loadConfig();
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.fileWatcher) {
      clearInterval(this.fileWatcher);
    }
  }
}

// Export singleton instance
export const allowlistManager = new AllowlistManager();

// Export for Docker config generation
export function getDockerAllowedDomains(): string[] {
  return allowlistManager.getAllowedWebsites();
}