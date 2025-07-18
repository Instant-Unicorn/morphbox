# Security Policy

## 🚨 CRITICAL SECURITY INFORMATION 🚨

MorphBox is a powerful development environment that provides terminal access, file system access, and code execution capabilities. This document outlines critical security considerations.

## Threat Model

MorphBox is designed for **LOCAL DEVELOPMENT USE ONLY**. When exposed to networks, it becomes a high-value target because it provides:

1. **Terminal Access**: Full shell access to the host system
2. **File System Access**: Read/write access to the mounted workspace
3. **Code Execution**: Ability to run arbitrary code
4. **AI Assistant**: Claude Code can be instructed to perform system operations

## Security Modes

### 1. Local Mode (DEFAULT - SAFE)
- **Binding**: localhost only
- **Access**: Only from the same machine
- **Authentication**: Not required
- **Risk Level**: LOW
- **Use Case**: Normal development

### 2. VPN Mode (RECOMMENDED for remote access)
- **Binding**: VPN interface only
- **Access**: Only VPN-connected devices
- **Authentication**: Optional (use --auth)
- **Risk Level**: MEDIUM
- **Use Case**: Remote development on trusted networks

### 3. External Mode (DANGEROUS)
- **Binding**: All network interfaces (0.0.0.0)
- **Access**: Anyone on the network
- **Authentication**: MANDATORY (but not sufficient)
- **Risk Level**: EXTREME
- **Use Case**: Only in air-gapped, isolated environments

## Known Security Risks

### In External Mode:
1. **Remote Code Execution**: Attackers can run any command
2. **Data Exfiltration**: Source code and secrets can be stolen
3. **Privilege Escalation**: Terminal access may lead to root compromise
4. **Lateral Movement**: Your machine becomes an attack vector
5. **Resource Hijacking**: CPU/GPU can be used for cryptomining

### General Risks:
1. **No Sandboxing**: Commands run with user privileges
2. **No Rate Limiting**: Brute force attacks possible
3. **No Audit Logging**: Limited forensic capabilities
4. **WebSocket Security**: Less mature than HTTPS

## Security Best Practices

### 1. Never Use External Mode On:
- ❌ Public WiFi
- ❌ Corporate networks
- ❌ Production servers
- ❌ Machines with sensitive data
- ❌ Machines with production credentials

### 2. Always:
- ✅ Use local mode when possible
- ✅ Use VPN mode for remote access
- ✅ Keep MorphBox updated
- ✅ Review logs regularly
- ✅ Use strong, unique passwords
- ✅ Enable firewall rules

### 3. If You Must Use External Mode:
1. **Isolate the Network**: Use VLANs or air-gapped networks
2. **Restrict IPs**: Firewall rules to allow only specific IPs
3. **Monitor Access**: Log and alert on all connections
4. **Time Box**: Only enable when actively needed
5. **Assume Compromise**: Treat the machine as potentially compromised

## Incident Response

### If you suspect unauthorized access:

1. **Immediate Actions**:
   ```bash
   # Stop MorphBox
   pkill -f morphbox
   
   # Block ports
   sudo iptables -A INPUT -p tcp --dport 8008 -j DROP
   sudo iptables -A INPUT -p tcp --dport 8009 -j DROP
   ```

2. **Investigation**:
   ```bash
   # Check connections
   netstat -an | grep -E "8008|8009"
   
   # Review process list
   ps aux | grep -E "node|npm|claude"
   
   # Check recent file changes
   find ~ -mtime -1 -type f
   
   # Review command history
   history | tail -100
   ```

3. **Containment**:
   - Disconnect from network
   - Preserve logs for analysis
   - Check for persistence mechanisms
   - Review user accounts and SSH keys

4. **Recovery**:
   - Consider full system reinstall if sensitive data was present
   - Rotate all credentials
   - Implement additional monitoring

## Reporting Security Issues

If you discover a security vulnerability:

1. **DO NOT** open a public issue
2. **DO** email security reports to: security@morphbox.dev
3. **Include**:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fixes (if any)

## Security Hardening Checklist

- [ ] Using local mode (not --external)
- [ ] If remote access needed, using VPN mode
- [ ] Strong passwords set (if auth enabled)
- [ ] Firewall configured
- [ ] Monitoring enabled
- [ ] Regular updates applied
- [ ] Backup strategy in place
- [ ] Incident response plan ready

## Authentication Details

When authentication is enabled:
- Username and password are required for all access
- Credentials are shown when starting MorphBox
- Sessions expire after 7 days
- No password recovery mechanism (by design)

## Future Security Enhancements

Planned improvements:
1. Audit logging
2. Rate limiting
3. IP allowlisting
4. 2FA support
5. Encrypted storage
6. Sandboxed execution
7. Read-only mode

Remember: **Security is your responsibility**. MorphBox provides tools, but proper configuration and usage are critical for maintaining security.

---

**When in doubt, don't expose MorphBox to the network.**