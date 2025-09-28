- never run morphbox dev server
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
- Terminal (`web/src/lib/Terminal.svelte`) - PTY terminal emulator
- Claude (`web/src/lib/Claude.svelte`) - AI assistant interface
- FileExplorer (`web/src/lib/panels/FileExplorer/`) - File navigation
- CodeEditor (`web/src/lib/panels/CodeEditor/`) - Monaco editor integration
- GitPanel (`web/src/lib/panels/GitPanel/`) - Git operations
- WebBrowser (`web/src/lib/panels/WebBrowser/`) - Web preview
- Settings (`web/src/lib/panels/Settings/`) - Configuration
- TaskRunner (`web/src/lib/panels/TaskRunner/`) - Command execution
- PromptQueue (`web/src/lib/panels/PromptQueue/`) - Claude prompt management

### Important Patterns
- Use `panelId` prop to namespace all panel-specific operations
- Handle WebSocket via `getContext('websocket')`
- Clean up resources in `onDestroy()`
- Use CSS variables for theming consistency
- Support multiple panel instances with unique IDs

### Container Context
Remember panels run inside Docker containers with:
- Container filesystem paths
- Container networking
- Resource limits
- Volume mounts for persistence