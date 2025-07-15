# Changelog

## 2025-07-15

### Fixed
- Fixed terminal hanging on "Welcome to Morphbox" by reverting problematic screen implementation
- Removed top and bottom UI bars, keeping only the panel dropdown in top-right
- Fixed FileExplorer persisting in sessionStorage when it shouldn't
- Terminal now works reliably without persistence features

### Attempted Features
- **Terminal Session Persistence**: Attempted multiple approaches but encountered issues:
  1. PTY session manager - didn't persist across server restarts
  2. GNU screen - showed unwanted UI elements blocking terminal
  3. Claude's --resume flag - session IDs not exposed in output
  4. tmux inside container - caused visual display issues
  
### Technical Notes
- Session persistence remains challenging due to:
  - Terminal multiplexers (screen/tmux) interfering with xterm.js display
  - Claude CLI not exposing session IDs for programmatic resume
  - Container environment complicating process management
- The terminal infrastructure supports session IDs and reconnection
- Future work could explore:
  - Custom process management inside container
  - Patching Claude CLI to expose session info
  - Alternative terminal emulation approaches