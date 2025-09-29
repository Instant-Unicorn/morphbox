# MorphBox VM Architecture

## Overview

MorphBox uses a hybrid architecture where the web server runs on the host machine while providing an isolated Docker environment for development work. Understanding this architecture is crucial for understanding file access, panel management, and security boundaries.

## Architecture Diagram

```
┌─────────────────────────────────────┐
│ HOST MACHINE                        │
│  - MorphBox web server (Node.js)    │
│  - Panel APIs (read/write)          │
│  - Claude CLI for generation        │
│  - /home/kruger/morphbox/panels/    │
└─────────────────────────────────────┘
              ↕ (WebSocket/HTTP)
┌─────────────────────────────────────┐
│ DOCKER CONTAINER (morphbox-vm)      │
│  - Your Claude Code session         │
│  - /workspace (your project)        │
│  - /home/morphbox (container home)  │
│  - ❌ NO ACCESS to host panels dir  │
└─────────────────────────────────────┘
```

## Components

### 1. Host Machine Components

**MorphBox Web Server** (`server-packaged.js`)
- Runs on host at `/home/kruger/.nvm/versions/node/v22.19.0/lib/node_modules/morphbox/`
- Serves the web UI on port 8008 (default)
- Handles all HTTP/WebSocket traffic
- Process: `node /home/kruger/.nvm/.../morphbox/server-packaged.js`

**Panel Storage**
- Location: `/home/kruger/morphbox/panels/`
- Contains: `*.morph` files (custom panel definitions)
- Accessible by: Host processes only (web server, panel APIs)
- NOT accessible from: Docker container

**Panel Generation**
- Uses host's Claude CLI installation
- Command: `spawn('claude', ['-p', prompt])` runs on HOST
- Working directory: Temporary directory on host
- Output: Saved directly to host's panels directory

**Panel APIs** (`/api/custom-panels/*`)
- `/api/custom-panels/create` - Creates panels using host Claude CLI
- `/api/custom-panels/list` - Lists panels from host directory
- `/api/custom-panels/export/[id]` - Exports panels from host
- `/api/custom-panels/import` - Imports panels to host
- All use `homedir()` which returns `/home/kruger` (host's home)

### 2. Docker Container Components

**Container Name**: `morphbox-vm`

**Mounted Volumes**:
```yaml
volumes:
  - $USER_DIR:/workspace                    # User's project directory
  - $SCRIPT_DIR:/workspace/morphbox         # MorphBox package files
  - claude-home:/home/morphbox              # Persistent home directory
  - claude-config:/home/morphbox/.config/claude-code  # Claude settings
  - claude-npm-cache:/usr/local/lib/node_modules      # NPM cache
  - claude-npm-bin:/usr/local/bin           # NPM binaries
```

**User's Claude Code Session**
- Runs inside Docker container
- Home directory: `/home/morphbox` (inside container)
- Cannot access: `/home/kruger/morphbox/panels/` from host
- Can access: `/workspace` (mounted project directory)

**Container Isolation**
- Separate filesystem from host
- Volume mounts for specific directories only
- No direct access to host's home directory
- Communicates with host via SSH/WebSocket

## File Access Matrix

| Location | Host Server | Docker Container | Web UI |
|----------|-------------|------------------|--------|
| `/home/kruger/morphbox/panels/` | ✅ Full Access | ❌ No Access | ✅ Via API |
| `/home/kruger/projects/morphbox/` | ✅ Full Access | ✅ Via `/workspace` | ✅ Via API |
| `/home/morphbox/` | ❌ No Access | ✅ Full Access | ❌ No Access |

## Data Flow

### Panel Creation Flow

1. User submits panel request via web UI
2. Web server receives POST to `/api/custom-panels/create` (runs on HOST)
3. Server spawns `claude` CLI on HOST with prompt
4. Claude generates panel code on HOST
5. Server saves `.morph` file to `/home/kruger/morphbox/panels/` on HOST
6. Web UI loads panel from host filesystem via API
7. Panel renders in browser (sandboxed by browser security)

### Panel Access from Claude Code

**Current State**: Claude Code inside Docker CANNOT access panels directory

**Why**: The panels directory (`/home/kruger/morphbox/panels/`) is not mounted into the Docker container

**Solution**: Add volume mount to docker-compose configuration:
```yaml
- $HOME/morphbox/panels:/home/morphbox/.morphbox/panels
```

This would make panels accessible at `/home/morphbox/.morphbox/panels/` inside the container.

## Security Boundaries

### What IS Sandboxed

✅ **User workspace code execution** - Runs in Docker, isolated from host
✅ **Panel rendering** - Runs in browser, sandboxed by browser security model
✅ **Container filesystem** - Separate from host, only specific mounts visible

### What is NOT Sandboxed

❌ **Panel generation** - Claude CLI runs on host, not in Docker
❌ **Web server** - Node.js server runs on host
❌ **Panel storage** - Files stored on host filesystem

### Security Trade-offs

The current architecture provides:

1. **User Code Isolation**: Your development work happens in Docker, protecting the host
2. **Trusted Panel Generation**: Panel creation uses host's Claude CLI, allowing full capabilities
3. **Browser Sandboxing**: Generated panels run in browser with limited API access

This design prioritizes:
- Isolating user workspace from host system
- Allowing powerful AI-assisted panel generation
- Keeping generated panels simple (HTML/CSS/JavaScript)

## Communication

### Host ↔ Docker Communication

**SSH**: Container runs SSH server on port 2222
```bash
ssh -p 2222 morphbox@localhost
```

**Docker Exec**: Direct command execution
```bash
docker exec morphbox-vm [command]
```

**Volume Mounts**: Shared filesystem access for specific directories

### Web UI ↔ Backend Communication

**HTTP**: RESTful API endpoints
- Port 8008 (default)
- Handles panel management, file operations

**WebSocket**: Real-time bidirectional communication
- PTY terminal streams
- Live updates and notifications
- Panel-to-backend communication

## Environment Variables

### Host Environment

```bash
MORPHBOX_HOST=localhost        # Bind address
MORPHBOX_PORT=8008            # Web server port
MORPHBOX_PACKAGED=true        # Running from NPM package
ANTHROPIC_API_KEY=...         # Optional: Claude API key
```

### Container Environment

```bash
TERM=xterm-256color           # Terminal type
COLORTERM=truecolor           # Color support
ANTHROPIC_API_KEY=...         # Passed from host
```

## Process Tree

```
Host Machine:
├── morphbox (shell script)
│   ├── websocket-proxy.js (WebSocket server)
│   └── server-packaged.js (Web server + APIs)
│
└── Docker daemon
    └── morphbox-vm (container)
        ├── sshd (SSH server)
        ├── tmux (terminal multiplexer)
        └── claude (Claude Code sessions)
```

## Startup Sequence

1. User runs `morphbox` command on host
2. Script checks for existing `morphbox-vm` container
3. If not exists, creates container via docker-compose
4. Mounts user's current directory as `/workspace`
5. Starts WebSocket proxy on host
6. Starts web server on host
7. Opens browser to `http://localhost:8008`
8. User connects to container terminals via SSH/WebSocket

## Important Paths

### On Host

| Path | Purpose |
|------|---------|
| `/home/kruger/.nvm/.../morphbox/` | Installed NPM package |
| `/home/kruger/morphbox/panels/` | Custom panel storage |
| `/home/kruger/projects/morphbox/` | Source code (if developing) |

### In Container

| Path | Purpose |
|------|---------|
| `/workspace` | User's mounted project directory |
| `/workspace/morphbox` | MorphBox package files (read-only reference) |
| `/home/morphbox` | Container user's home directory |
| `/home/morphbox/.config/claude-code` | Claude Code configuration |

## Debugging

### Check What's Running Where

**On Host**:
```bash
ps aux | grep -E "morphbox|node" | grep -v grep
```

**In Container**:
```bash
docker exec morphbox-vm ps aux
```

### Check Mounts

```bash
docker inspect morphbox-vm --format='{{range .Mounts}}{{.Source}} -> {{.Destination}}{{"\n"}}{{end}}'
```

### Access Container Shell

```bash
docker exec -it morphbox-vm bash
```

## Common Misconceptions

### ❌ "MorphBox runs entirely in Docker"
**Reality**: Only the user's development environment runs in Docker. The web server and panel management run on the host.

### ❌ "Panels are sandboxed in Docker"
**Reality**: Panel generation happens on the host using the host's Claude CLI. Only the rendered panels run in the browser sandbox.

### ❌ "Claude Code inside Docker can access host files"
**Reality**: Only specifically mounted directories (like `/workspace`) are accessible. The host's home directory and panels folder are not mounted by default.

## Future Considerations

### Potential Improvements

1. **Mount panels directory into container**: Allow Claude Code to directly edit panels
2. **Run panel generation in container**: True sandboxing of panel creation
3. **API proxy for panel access**: Container-based Claude could access panels via API
4. **Shared volume for panels**: Both host and container could access same panel storage

### Trade-offs to Consider

- **Performance**: Host-based Claude CLI is faster than Docker exec
- **Security**: Container-based generation would be more isolated
- **Complexity**: More mounts = more complex configuration
- **Compatibility**: Some operations easier on host than in container