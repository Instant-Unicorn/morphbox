# External Access Configuration

MorphBox can be configured to accept connections from external networks, not just localhost. This is useful for:
- Testing on different devices on your network
- Collaborating with team members
- Accessing MorphBox from a VM or container

## 🚨 EXTREME SECURITY WARNING - READ CAREFULLY 🚨

**⚠️ CRITICAL: The `--external` flag exposes your ENTIRE development environment to ANYONE on your network!**

### What --external mode exposes:
- ❌ **FULL terminal access with root capabilities**
- ❌ **Complete file system access** - attackers can read, modify, or delete ANY file
- ❌ **Command execution** - attackers can run ANY command on your system
- ❌ **Environment variables** - including API keys, passwords, and secrets
- ❌ **Network pivot** - your machine can be used to attack other systems
- ❌ **Claude AI access** - attackers can use your AI assistant to write malicious code

### Real-world attack scenarios:
1. **Code theft**: Attackers can steal your entire codebase, including proprietary code
2. **Credential harvesting**: SSH keys, AWS credentials, API tokens can be stolen
3. **Backdoor installation**: Persistent malware can be installed on your system
4. **Ransomware**: Your files can be encrypted and held for ransom
5. **Cryptomining**: Your machine can be used to mine cryptocurrency
6. **Lateral movement**: Your machine becomes a launching point for network attacks

### Authentication is NOT enough:
While `--external` mode now requires authentication:
- 🔐 This only prevents casual/accidental access
- ⚠️ **Does NOT protect against determined attackers**
- ⚠️ **Does NOT protect against vulnerabilities in the application**
- ⚠️ **Does NOT protect against brute force attacks**

### ONLY use --external when ALL of these are true:
✅ You are on a completely isolated network (air-gapped)
✅ The machine contains NO sensitive data
✅ The machine has NO access to production systems
✅ You understand and accept the risks
✅ You have explicit permission from your security team
✅ You have monitoring and alerting in place

### NEVER use --external:
❌ On public WiFi
❌ On corporate networks
❌ On machines with production access
❌ On machines with customer data
❌ On machines with source code for commercial products
❌ When working with sensitive or regulated data

**If you're unsure whether to use --external, the answer is NO.**

## Usage

### Command Line Options

```bash
# Default - local only (safe)
./morphbox-start

# Expose to network (requires confirmation)
./morphbox-start --external

# Explicitly set to local only
./morphbox-start --local
```

### Configuration File

For persistent configuration, create a `.morphbox.env` file:

```bash
cp .morphbox.env.example .morphbox.env
```

Edit `.morphbox.env`:
```env
# Set to "external" to always bind to all interfaces
MORPHBOX_BIND_MODE=external

# Or leave as "local" for localhost only (default)
MORPHBOX_BIND_MODE=local
```

## Network Details

When running with `--external`:
- Web interface binds to `0.0.0.0:8008` (all interfaces)
- WebSocket server binds to `0.0.0.0:8009` (all interfaces)
- The launcher will display your local IP address for easy access

## Firewall Configuration

You may need to allow ports 8008 and 8009 through your firewall:

### Linux (ufw)
```bash
sudo ufw allow 8008/tcp
sudo ufw allow 8009/tcp
```

### macOS
The firewall will prompt you to allow connections when you first run with `--external`.

### Windows
```powershell
New-NetFirewallRule -DisplayName "MorphBox Web" -Direction Inbound -LocalPort 8008 -Protocol TCP -Action Allow
New-NetFirewallRule -DisplayName "MorphBox WebSocket" -Direction Inbound -LocalPort 8009 -Protocol TCP -Action Allow
```

## Safer Alternatives to --external

### 1. Use VPN Mode (RECOMMENDED)
```bash
./morphbox-start --vpn
```
- Only accessible via VPN connection
- Much more secure than --external
- Optional authentication with `--vpn --auth`

### 2. SSH Tunneling
```bash
# On remote machine
ssh -L 8008:localhost:8008 -L 8009:localhost:8009 user@morphbox-host

# Then access via localhost on remote machine
open http://localhost:8008
```

### 3. Reverse Proxy with Authentication
Use nginx/Apache with proper authentication and HTTPS.

### 4. Docker with Limited Networking
Run MorphBox in a container with restricted network access.

## If You MUST Use --external

### Minimum Security Requirements:
1. **Generate strong credentials** - Use the auto-generated passwords
2. **Firewall rules** - Restrict to specific IP addresses
3. **Network isolation** - Use a separate VLAN
4. **Monitoring** - Log all access attempts
5. **Time limits** - Only enable when actively needed
6. **Regular updates** - Keep MorphBox and dependencies updated

### Additional Hardening:
```bash
# Restrict to specific IPs with iptables
sudo iptables -A INPUT -p tcp --dport 8008 -s TRUSTED_IP -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 8008 -j DROP

# Use fail2ban to block brute force attempts
sudo apt-get install fail2ban
```

### Monitoring Commands:
```bash
# Watch for connections
watch -n 1 'netstat -an | grep -E "8008|8009"'

# Monitor auth attempts (after implementing logging)
tail -f ~/morphbox/logs/auth.log

# Check for suspicious processes
ps aux | grep -v grep | grep -E "node|npm"
```

## Emergency Response

If you suspect compromise while using --external:
1. **Immediately stop MorphBox**: `pkill -f morphbox`
2. **Block the ports**: `sudo iptables -A INPUT -p tcp --dport 8008 -j DROP`
3. **Check for persistence**: Review crontab, systemd services
4. **Audit commands**: Review `history`, check for new users
5. **Check file modifications**: `find ~ -mtime -1 -type f`
6. **Consider the machine compromised**: Reinstall if sensitive data was accessible

## Troubleshooting

If external access isn't working:
1. Check firewall settings
2. Verify the displayed IP address is correct
3. Ensure no other services are using ports 8008/8009
4. Check that your network allows local device communication