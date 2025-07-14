# External Access Configuration

MorphBox can be configured to accept connections from external networks, not just localhost. This is useful for:
- Testing on different devices on your network
- Collaborating with team members
- Accessing MorphBox from a VM or container

## ⚠️ Security Warning

Exposing MorphBox externally opens your development environment to network access. Only use this feature on trusted networks and never on public WiFi.

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

## Best Practices

1. **Always use `--local` (default) when on public networks**
2. **Use `--external` only on trusted networks**
3. **Consider using a VPN for remote access instead of exposing directly**
4. **Monitor access logs when running externally**
5. **Disable external access when not needed**

## Troubleshooting

If external access isn't working:
1. Check firewall settings
2. Verify the displayed IP address is correct
3. Ensure no other services are using ports 8008/8009
4. Check that your network allows local device communication