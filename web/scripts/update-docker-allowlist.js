#!/usr/bin/env node

/**
 * Updates Docker container's iptables rules based on morphbox-allowlist.conf
 * This script generates and applies firewall rules for allowed websites
 */

import { execSync } from 'child_process';
import { getDockerAllowedDomains } from '../src/lib/server/allowlist-manager.js';
import dns from 'dns';
import { promisify } from 'util';

const resolve4 = promisify(dns.resolve4);
const resolve6 = promisify(dns.resolve6);

async function resolveDomainsToIPs(domains) {
  const ips = new Set();
  
  for (const domain of domains) {
    try {
      // Skip IP addresses
      if (/^\d+\.\d+\.\d+\.\d+$/.test(domain)) {
        ips.add(domain);
        continue;
      }
      
      // Resolve IPv4
      try {
        const ipv4s = await resolve4(domain);
        ipv4s.forEach(ip => ips.add(ip));
      } catch {}
      
      // Resolve IPv6
      try {
        const ipv6s = await resolve6(domain);
        ipv6s.forEach(ip => ips.add(ip));
      } catch {}
      
      console.log(`✓ Resolved ${domain} to ${ips.size} IPs`);
    } catch (error) {
      console.warn(`⚠ Could not resolve ${domain}: ${error.message}`);
    }
  }
  
  return Array.from(ips);
}

async function updateDockerFirewall() {
  console.log('🔧 Updating Docker container firewall rules...\n');
  
  const allowedDomains = getDockerAllowedDomains();
  console.log(`Found ${allowedDomains.length} allowed domains in config\n`);
  
  if (allowedDomains.length === 0) {
    console.log('No domains configured, skipping firewall update');
    return;
  }
  
  // Resolve all domains to IPs
  const allowedIPs = await resolveDomainsToIPs(allowedDomains);
  console.log(`\nResolved to ${allowedIPs.length} unique IP addresses\n`);
  
  // Generate iptables rules script
  const script = generateIptablesScript(allowedIPs, allowedDomains);
  
  // Save script for manual execution if needed
  const scriptPath = '/tmp/morphbox-iptables.sh';
  require('fs').writeFileSync(scriptPath, script, { mode: 0o755 });
  console.log(`📝 Firewall script saved to: ${scriptPath}\n`);
  
  // Apply rules to Docker container
  try {
    console.log('🚀 Applying firewall rules to morphbox-vm container...\n');
    
    // Copy script to container
    execSync(`docker cp ${scriptPath} morphbox-vm:/tmp/update-firewall.sh`);
    
    // Execute script in container
    const output = execSync('docker exec morphbox-vm sudo bash /tmp/update-firewall.sh', {
      encoding: 'utf-8'
    });
    
    console.log(output);
    console.log('✅ Firewall rules updated successfully!\n');
    
  } catch (error) {
    console.error('❌ Failed to apply firewall rules:');
    console.error(error.message);
    console.error('\nYou can manually apply the rules by running:');
    console.error(`  docker cp ${scriptPath} morphbox-vm:/tmp/update-firewall.sh`);
    console.error('  docker exec morphbox-vm sudo bash /tmp/update-firewall.sh');
  }
}

function generateIptablesScript(ips, domains) {
  return `#!/bin/bash
# MorphBox Docker Firewall Rules
# Generated from morphbox-allowlist.conf
# Domains: ${domains.length}
# Resolved IPs: ${ips.length}

set -e

echo "📋 Configuring firewall rules..."

# Backup current rules
iptables-save > /tmp/iptables.backup 2>/dev/null || true

# Function to add rules safely
add_rule() {
  # Check if rule already exists before adding
  if ! iptables -C "$@" 2>/dev/null; then
    iptables -A "$@"
    echo "  ✓ Added rule: $*"
  else
    echo "  ⏭ Rule exists: $*"
  fi
}

# Create custom chain for MorphBox if it doesn't exist
if ! iptables -L MORPHBOX_ALLOW -n 2>/dev/null; then
  iptables -N MORPHBOX_ALLOW
  echo "✓ Created MORPHBOX_ALLOW chain"
fi

# Clear existing rules in our chain
iptables -F MORPHBOX_ALLOW

# Allow established connections
add_rule MORPHBOX_ALLOW -m state --state ESTABLISHED,RELATED -j ACCEPT

# Allow loopback
add_rule MORPHBOX_ALLOW -i lo -j ACCEPT
add_rule MORPHBOX_ALLOW -o lo -j ACCEPT

# Allow DNS (needed for resolution)
add_rule MORPHBOX_ALLOW -p udp --dport 53 -j ACCEPT
add_rule MORPHBOX_ALLOW -p tcp --dport 53 -j ACCEPT

# Allow specific IPs from config
${ips.map(ip => `add_rule MORPHBOX_ALLOW -d ${ip} -j ACCEPT`).join('\n')}

# Log dropped packets (optional, comment out if too verbose)
# add_rule MORPHBOX_ALLOW -m limit --limit 1/sec -j LOG --log-prefix "MORPHBOX_DROP: "

# Drop everything else
add_rule MORPHBOX_ALLOW -j DROP

# Link our chain to OUTPUT if not already linked
if ! iptables -C OUTPUT -j MORPHBOX_ALLOW 2>/dev/null; then
  iptables -I OUTPUT 1 -j MORPHBOX_ALLOW
  echo "✓ Linked MORPHBOX_ALLOW chain to OUTPUT"
fi

echo ""
echo "✅ Firewall rules applied successfully!"
echo ""
echo "Allowed domains (${domains.length}):"
${domains.map(d => `echo "  • ${d}"`).join('\n')}
echo ""
echo "To remove these rules, run:"
echo "  iptables -D OUTPUT -j MORPHBOX_ALLOW"
echo "  iptables -F MORPHBOX_ALLOW"
echo "  iptables -X MORPHBOX_ALLOW"
`;
}

// Run if called directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  updateDockerFirewall().catch(console.error);
}

export { updateDockerFirewall };