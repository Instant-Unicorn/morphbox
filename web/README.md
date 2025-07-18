# MorphBox Web Interface

A powerful web-based development environment with AI-powered coding assistant (Claude), terminal access, and customizable panels.

## 🚨 CRITICAL SECURITY WARNING - EXTERNAL MODE 🚨

**⚠️ EXTREME CAUTION: The `--external` flag exposes your ENTIRE development environment to the network!**

### What --external mode exposes:
- ❌ **FULL terminal access to your system**
- ❌ **Complete file system access** (read/write/delete)
- ❌ **Ability to execute ANY command** on your machine
- ❌ **Access to environment variables and secrets**
- ❌ **Network access from your machine**

### Security implications:
- 🔴 **ANYONE on the network can control your machine**
- 🔴 **Your source code can be stolen**
- 🔴 **Malware can be installed**
- 🔴 **Your credentials and secrets can be exposed**
- 🔴 **Your machine can be used as a pivot point for attacks**

### When to use --external:
- ✅ **ONLY on completely isolated, air-gapped networks**
- ✅ **ONLY with machines containing no sensitive data**
- ✅ **ONLY when you fully understand the risks**
- ✅ **NEVER on public WiFi or untrusted networks**
- ✅ **NEVER on development machines with production access**

### Authentication in --external mode:
While `--external` mode includes mandatory authentication:
- 🔐 Random credentials are generated on startup
- 🔐 All connections require authentication
- ⚠️ **This is NOT sufficient protection against determined attackers**
- ⚠️ **Authentication only prevents casual access**

## Safe Usage Options

### 1. Local Mode (Default - RECOMMENDED)
```bash
cd web && npm run dev
# or
./morphbox-start
```
- ✅ Only accessible from localhost
- ✅ Safe for development
- ✅ No authentication required

### 2. VPN Mode (Recommended for remote access)
```bash
./morphbox-start --vpn
```
- ✅ Binds only to VPN interface (Tailscale, WireGuard, etc.)
- ✅ Accessible only to VPN-connected devices
- ✅ Much safer than external mode
- ✅ Optional authentication with `--vpn --auth`

### 3. Terminal Mode (Claude only)
```bash
npm run start:terminal
# or
node server.js --terminal
```
- ✅ Minimal interface with only Claude Code
- ✅ No panel management or file explorer
- ✅ Reduced attack surface

## Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/morphbox.git
cd morphbox/web

# Install dependencies
npm install

# Build the project
npm run build
```

## Development

```bash
# Start in development mode (recommended)
npm run dev

# Start WebSocket server separately
npm run dev:ws

# Type checking
npm run check
```

## Features

- 🤖 **Claude Code Integration**: AI-powered coding assistant
- 🖥️ **Terminal Access**: Full terminal with session persistence
- 📁 **File Explorer**: Browse and edit files
- 🎨 **Customizable Panels**: Drag-and-drop interface with color customization
- 📊 **Responsive Layout**: Adapts to different screen sizes
- 🔐 **Authentication**: Mandatory for external mode, optional for VPN
- 🌙 **Theme Support**: Light and dark themes

## Architecture

- **Frontend**: SvelteKit with TypeScript
- **Backend**: Node.js with WebSocket support
- **Terminal**: node-pty for terminal emulation
- **Database**: SQLite for session and panel persistence
- **Authentication**: Token-based with secure session management

## Configuration

### Environment Variables
- `MORPHBOX_HOST`: Bind address (default: localhost)
- `MORPHBOX_AUTH_MODE`: Authentication mode (none/vpn/external)
- `MORPHBOX_AUTH_USERNAME`: Auth username (auto-generated if not set)
- `MORPHBOX_AUTH_PASSWORD`: Auth password (auto-generated if not set)

## Production Deployment

**⚠️ WARNING: This application is designed for LOCAL DEVELOPMENT USE ONLY!**

If you must deploy to production:
1. **NEVER use --external mode**
2. Use a proper reverse proxy (nginx, Apache)
3. Enable HTTPS/TLS
4. Use proper authentication (OAuth, SAML)
5. Implement rate limiting
6. Add request logging and monitoring
7. Isolate in containers/VMs
8. Regular security audits

## Contributing

Please ensure any contributions maintain or improve security:
- No features that bypass authentication
- No features that increase attack surface
- Security warnings must remain prominent
- Default to secure configurations

## License

Apache License 2.0 - See LICENSE file for details.

---

**Remember: With great power comes great responsibility. MorphBox gives you powerful tools - use them wisely and securely!**