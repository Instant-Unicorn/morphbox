## Running Dev Servers
MorphBox requires TWO dev servers running simultaneously:
1. **WebSocket server**: `cd /home/kruger/projects/morphbox/web && MORPHBOX_HOST=100.96.36.2 npm run dev:ws` (background)
2. **Vite dev server**: `cd /home/kruger/projects/morphbox/web && HOST=100.96.36.2 npm run dev` (background)

Both must run on Tailscale IP (100.96.36.2), not localhost or external IPs. Use `run_in_background: true` when starting via Bash tool.

- Always use web/prepare-package.sh for the publishing script, never make a new file

## MorphBox Panel Development

When working with MorphBox panels, refer to the comprehensive guide at `/home/kruger/projects/morphbox/MORPHBOX_PANEL_DEVELOPMENT_GUIDE.md` which covers:

### Key Panel Concepts
- **Panel Structure**: All panels extend `BasePanel.svelte` and follow the `PanelConfig` and `PanelState` interfaces
- **Registry System**: Panels are registered in `web/src/lib/panels/registry.ts`
- **WebSocket Communication**: Panels communicate with backend via WebSocket context
- **File Locations**:
  - Base panel: `web/src/lib/panels/BasePanel.svelte`
  - Panel types: `web/src/lib/panels/types.ts`
  - Panel registry: `web/src/lib/panels/registry.ts`
  - Custom loader: `web/src/lib/panels/CustomPanelLoader.svelte`

### Creating New Panels
1. Create component in `web/src/lib/panels/YourPanel/YourPanel.svelte`
2. Register in `registry.ts` under `initializeBuiltins()`
3. Export from `web/src/lib/panels/index.ts`

### Built-in Panels
- **Sandbox Terminal** (`web/src/lib/Terminal.svelte` with `sandboxed={true}`) - PTY terminal in container, safe for AI autonomy
- **Admin Terminal** (`web/src/lib/Terminal.svelte` with `sandboxed={false}`) - PTY terminal on host, for system access
- FileExplorer (`web/src/lib/panels/FileExplorer/`) - File navigation
- CodeEditor (`web/src/lib/panels/CodeEditor/`) - Monaco editor integration
- GitPanel (`web/src/lib/panels/GitPanel/`) - Git operations
- WebBrowser (`web/src/lib/panels/WebBrowser/`) - Web preview
- Settings (`web/src/lib/panels/Settings/`) - Configuration
- TaskRunner (`web/src/lib/panels/TaskRunner/`) - Command execution
- PromptQueue (`web/src/lib/panels/PromptQueue/`) - Claude prompt management

### Terminal Architecture
MorphBox now has **two terminal types** solving a key architectural issue:

**The Problem:**
- Originally, terminals ran only in sandboxed containers (safe for AI)
- But this broke real workflows: git push, NGINX builds, production deploys
- The old "Claude Panel" was just a wrapper around Terminal

**The Solution:**
1. **Sandbox Terminal** - Runs in container with `sandboxed={true}`
   - Safe for AI with `--dangerously-skip-permissions` mode
   - Contained blast radius
   - Primary terminal for AI automation

2. **Admin Terminal** - Runs on host with `sandboxed={false}` ⚠️
   - Direct host access for git, builds, deployments
   - Use with caution - full system access
   - For tasks requiring real system access

**Why this works:**
- AI can run autonomously in Sandbox Terminal (safe)
- Real workflows (git, NGINX) work in Admin Terminal (host access)
- No architectural rewrite needed - just exposed what was already there
- Other panels (FileExplorer, CodeEditor, GitPanel) already talk to host

### Important Patterns
- Use `panelId` prop to namespace all panel-specific operations
- Handle WebSocket via `getContext('websocket')`
- Clean up resources in `onDestroy()`
- Use CSS variables for theming consistency
- Support multiple panel instances with unique IDs
- For terminals, specify `sandboxed` prop based on use case

### Container Context
**Sandbox Terminals** run inside Docker containers with:
- Container filesystem paths
- Container networking
- Resource limits
- Volume mounts for persistence

**Admin Terminals** run directly on the host system with:
- Full filesystem access
- Host networking
- No resource limits (host limits apply)
- Direct access to git, docker, system tools