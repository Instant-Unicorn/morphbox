# Changelog

## 2025-07-15

### Added
- **Terminal Session Persistence**: Implemented terminal session persistence using tmux inside the morphbox-vm container
  - Sessions automatically persist across browser disconnects and server restarts
  - Users can seamlessly reconnect to their Claude conversations without losing context
  - Tmux sessions are managed inside the container for better reliability
  - Automatic cleanup of inactive sessions after 24 hours
  - Session IDs are stored in browser sessionStorage for automatic reconnection

### Fixed
- Fixed terminal hanging on "Welcome to Morphbox" by reverting problematic screen implementation
- Removed top and bottom UI bars, keeping only the panel dropdown in top-right
- Fixed FileExplorer persisting in sessionStorage when it shouldn't

### Technical Details
- Attempted multiple persistence approaches:
  1. PTY session manager (didn't persist across server restarts)
  2. GNU screen (showed unwanted UI elements)
  3. Claude's --resume flag (session IDs not exposed in output)
  4. Final solution: tmux inside container (working reliably)
- Sessions are created with unique IDs and stored in sessionStorage
- WebSocket reconnection automatically reattaches to existing tmux sessions