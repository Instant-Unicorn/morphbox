# WebSocket Proxy VPN Mode Fix

## Problem
The WebSocket proxy was failing to start with the error:
```
[ERROR] WebSocket proxy failed to start or died immediately
```

Root cause: The `MORPHBOX_VM_PASSWORD` environment variable was not being passed to the WebSocket proxy process.

## Solution Implemented

### 1. Fixed Environment Variable Passing
Updated `/web/scripts/morphbox-start-packaged` to properly pass environment variables to the WebSocket proxy:

```bash
# Set environment variables for WebSocket proxy
MORPHBOX_VM_PASSWORD="${MORPHBOX_VM_PASSWORD:-changeme}" \
HOST="$BIND_HOST" \
PORT=8009 \
MORPHBOX_VM_HOST="localhost" \
MORPHBOX_VM_PORT=2222 \
MORPHBOX_VM_USER="morphbox" \
node "$WEB_DIR/websocket-proxy.js" > /tmp/morphbox-websocket-proxy.log 2>&1 &
```

### 2. Added Fallback Password Handling
Updated `/web/websocket-proxy.js` to use a fallback password with security warnings:

```javascript
let SSH_PASS = process.env.MORPHBOX_VM_PASSWORD;
if (!SSH_PASS) {
  console.warn('[WebSocket Proxy] WARNING: MORPHBOX_VM_PASSWORD not set, using default password');
  console.warn('[WebSocket Proxy] SECURITY: Set MORPHBOX_VM_PASSWORD environment variable for production use');
  SSH_PASS = 'changeme';
}
```

### 3. Created Configuration Template
Added `/web/.morphbox.env.example` for users to customize their configuration:

```bash
# Docker Container SSH Password
# SECURITY: Change this password in production!
MORPHBOX_VM_PASSWORD=changeme
```

## Configuration

### Using Custom Password
1. Copy the example configuration:
   ```bash
   cp .morphbox.env.example .morphbox.env
   ```

2. Edit `.morphbox.env` and set a secure password:
   ```bash
   MORPHBOX_VM_PASSWORD=your-secure-password-here
   ```

### Environment Variables
You can also set the password via environment variable:
```bash
export MORPHBOX_VM_PASSWORD=your-secure-password
morphbox --vpn
```

## Security Considerations

1. **Default Password**: The system uses "changeme" as the default password for development/testing
2. **Production Use**: Always set a custom password for production deployments
3. **VPN Mode**: When using `--vpn`, the service is only accessible via VPN connection
4. **Authentication**: Use `--auth` flag for additional security with VPN mode

## Testing

The fix has been tested and verified to work with:
- Local mode: `morphbox`
- VPN mode: `morphbox --vpn`
- External mode with auth: `morphbox --external --auth`

## Files Modified

1. `/web/scripts/morphbox-start-packaged` - Added environment variable passing
2. `/web/websocket-proxy.js` - Added fallback password handling
3. `/web/.morphbox.env.example` - Created configuration template
4. Installed npm package files updated to match