# MorphBox Security Implementation Guide

## Overview

This document describes the security model for MorphBox v0.9.4+, which uses network isolation as the primary security boundary. The application has been simplified to remove unnecessary authentication complexity while maintaining security through proper network configuration.

## Security Improvements Implemented

### 1. Network Isolation Security Model (v0.9.4+)
- ✅ **No password authentication**: SSH connections use empty passwords within isolated container
- ✅ **Network-based security**: Security enforced through localhost/VPN isolation
- ✅ **Origin validation**: WebSocket connections validate origin headers
- ✅ **VPN mode**: Restricts access to VPN-connected clients only

### 2. Container Security
- ✅ **Passwordless sudo**: Container user has NOPASSWD sudo for convenience in isolated environment
- ✅ **SSH configuration**: PermitEmptyPasswords enabled for simplified access
- ✅ **Network isolation**: Container only accessible via localhost or VPN

### 3. Input Validation & Sanitization
- ✅ **Command sanitization**: Input validation and dangerous pattern detection
- ✅ **Size limits**: Maximum input length to prevent DoS attacks (10KB max)
- ✅ **Path validation**: Prevents directory traversal attacks

### 4. Error Handling & Logging
- ✅ **Secure error messages**: Generic errors in production, no stack traces
- ✅ **Audit logging**: Security events logged with unique IDs
- ✅ **Security monitoring**: Webhook support for security alerts

### 5. Network Security
- ✅ **Security headers**: X-Frame-Options, CSP, and other protective headers
- ✅ **CORS protection**: Validates allowed origins for cross-origin requests

## Required Setup Steps

### Step 1: Configure Environment Variables (Optional)

For v0.9.4+, SSH passwords are no longer required. The only authentication needed is for external/VPN access with the --auth flag:

```bash
# Optional: Only needed if using --auth flag with --vpn or --external
MORPHBOX_AUTH_USERNAME=admin
MORPHBOX_AUTH_PASSWORD=your-secure-web-password

# Network security (automatically configured)
MORPHBOX_ALLOWED_ORIGINS=http://localhost:8008,http://localhost:8009
```

### Step 2: Build Docker Container

The Docker container uses passwordless authentication:

```bash
cd web/docker

# Simple build - no passwords required
docker compose build

# Start the container
docker compose up -d
```

### Step 3: Start MorphBox

No password configuration needed:

```bash
# Local mode (default - localhost only)
morphbox

# VPN mode (recommended for remote access)
morphbox --vpn

# VPN with optional authentication
morphbox --vpn --auth

# External mode (requires confirmation, not recommended)
morphbox --external
```

### Step 4: Verify Security Configuration

After starting MorphBox, verify the security features are working:

1. **Check authentication is required** (if in external/vpn mode):
   - Try accessing without credentials - should be denied
   - Login with configured credentials

2. **Test rate limiting**:
   - Attempt 5 failed logins
   - Verify you're blocked for 30 minutes

3. **Verify WebSocket origin validation**:
   - Connections from unauthorized origins should be rejected

4. **Check audit logging**:
   - Review logs for security events
   - Look for [SECURITY AUDIT] entries

## Security Best Practices

### For Development (Local Mode)

```bash
# Safe local development configuration
MORPHBOX_AUTH_MODE=none
MORPHBOX_HOST=localhost
NODE_ENV=development
```

### For Remote Access (VPN Mode)

```bash
# VPN access with authentication
MORPHBOX_AUTH_MODE=vpn
MORPHBOX_AUTH_ENABLED=true
MORPHBOX_HOST=10.8.0.1  # Your VPN IP
NODE_ENV=production
```

### For External Access (Dangerous!)

```bash
# External access - USE WITH EXTREME CAUTION
MORPHBOX_AUTH_MODE=external
MORPHBOX_HOST=0.0.0.0
NODE_ENV=production
# Authentication is mandatory in this mode
```

## Troubleshooting

### Problem: SSH connection failures

**Solution**: As of v0.9.4, passwords are not required. If you're upgrading:
1. Rebuild the Docker container with `docker compose build --no-cache`
2. Ensure you're using the latest version of MorphBox

### Problem: WebSocket connection rejected

**Solution**: Add your origin to MORPHBOX_ALLOWED_ORIGINS:
```bash
export MORPHBOX_ALLOWED_ORIGINS="http://localhost:8008,http://your-domain.com"
```

### Problem: Authentication failures/rate limiting

**Solution**: Check the configured credentials and wait for rate limit to expire:
- Default rate limit: 5 attempts per 15 minutes
- Block duration: 30 minutes

### Problem: Docker build issues

**Solution**: Clean rebuild without passwords:
```bash
docker compose down
docker compose build --no-cache
docker compose up -d
```

## Security Monitoring

### Audit Log Events

The system logs the following security events:
- `auth_success`: Successful authentication
- `auth_failure`: Failed authentication attempt
- `rate_limit`: Rate limit triggered
- `suspicious_input`: Potentially dangerous commands detected
- `error`: Security-related errors

### Webhook Integration

Configure a webhook URL to receive security alerts:
```bash
MORPHBOX_SECURITY_WEBHOOK_URL=https://your-webhook-endpoint.com/security
```

### Log Review

Regularly review security logs:
```bash
# View recent security events
grep "SECURITY AUDIT" logs/*.log

# Check for failed authentications
grep "auth_failure" logs/*.log

# Monitor rate limiting
grep "rate_limit" logs/*.log
```

## Migration from Previous Versions

If upgrading from MorphBox < v0.9.3:

1. **Backup your data** before upgrading
2. **Remove old Docker images**:
   ```bash
   docker-compose down
   docker rmi morphbox-vm
   ```
3. **Set up new environment variables** as described above
4. **Rebuild with security configuration**
5. **Test thoroughly** before exposing to any network

## Security Checklist

Before running MorphBox in production or exposing to networks:

- [ ] Strong passwords configured (16+ characters)
- [ ] Environment variables properly set
- [ ] Docker container rebuilt with security patches
- [ ] Authentication tested and working
- [ ] Rate limiting verified
- [ ] Audit logging enabled
- [ ] Security headers active
- [ ] Origin validation configured
- [ ] Regular security updates applied
- [ ] Monitoring and alerting configured

## Additional Security Resources

- Main security documentation: [/SECURITY.md](/SECURITY.md)
- Security configuration template: [/.env.security.example](/.env.security.example)
- Security utilities: [/web/src/lib/server/security-utils.ts](/web/src/lib/server/security-utils.ts)
- Rate limiter: [/web/src/lib/server/rate-limiter.ts](/web/src/lib/server/rate-limiter.ts)

## Support

For security-related questions or to report vulnerabilities:
- **DO NOT** open public GitHub issues for security vulnerabilities
- Email security reports to: security@morphbox.dev
- Include detailed reproduction steps and impact assessment

---

Last updated: 2025-09-08
Version: MorphBox v0.9.4+ Security Implementation