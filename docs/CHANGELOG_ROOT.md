# MorphBox Changelog

## v0.9.3 (2025-09-07)

### 🔒 Major Security Enhancements

#### Critical Security Fixes
- **No more hardcoded credentials**: All passwords must be set via environment variables
- **Fixed container privilege escalation**: Removed sudo NOPASSWD from Dockerfile
- **Added input sanitization**: Commands are validated and dangerous patterns logged
- **Secure error handling**: No stack traces or sensitive info in production

#### New Security Features
- **IP Allowlisting**: Control who can connect via simple config file
- **Website Allowlist**: Control what sites Docker can access (same config file)
- **Command Audit Trail**: All commands logged with risk assessment (JSON format)
- **Rate Limiting**: Prevents brute force attacks (5 attempts per 15 minutes)
- **Origin Validation**: WebSocket connections validate origin headers
- **Security Headers**: X-Frame-Options, CSP, and other protective headers

#### Configuration
- New unified config file: `morphbox-allowlist.conf` for IPs and websites
- Security configuration template: `.env.security.example`
- Audit logs stored in `morphbox-audit/` directory

#### Tools
- Audit log viewer: `node web/scripts/view-audit-log.js`
- Docker allowlist updater: `node web/scripts/update-docker-allowlist.js`

### 📦 Distribution Improvements
- Removed SQLite dependency for better npx compatibility
- Switched to JSON Lines format for audit logs (portable)

### 📝 Documentation
- Comprehensive security implementation guide: `docs/SECURITY_IMPLEMENTATION.md`
- Updated SECURITY.md with new mitigations
- Added security best practices and configuration examples

---

## v0.9.2 (Previous)

### Bug Fixes
- Fixed single Ctrl+C shutdown for morphbox
- Restored server-packaged-noagents.js for prepare-package.sh

### Refactoring
- Organized deprecated files into /deprecated directory
- Added missing websocket-proxy.js to web directory

---

## v0.9.1 (Previous)

### Features
- Initial Docker-based sandbox implementation
- Claude Code CLI integration
- WebSocket terminal support
- Basic authentication for external mode

### Known Issues (Fixed in v0.9.3)
- Hardcoded credentials in multiple files
- No audit logging
- No IP restrictions
- SQLite dependency issues with npx