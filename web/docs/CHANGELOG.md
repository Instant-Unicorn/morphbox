# Changelog

## 2025-07-18

### Added
- **FileExplorer Panel Enhancements**:
  - Integrated FileExplorer with real file system API endpoints
  - Added target panel selection menu in FileExplorer header
  - Users can now choose which panel (Editor, Terminal, Claude, Preview) will open files when double-clicked
  - Created fileTarget store to track file open targets per FileExplorer instance
  - Added file handler utility to manage opening files in appropriate panels

### Changed
- Updated fileOperations.ts to use actual API endpoints instead of mock data
- Modified API to use current working directory instead of hardcoded /workspace
- Updated GridPanel and RowPanel components to pass panelId to child components
- Added open event handling throughout the layout components

### Technical Details
- FileExplorer now fetches real directory contents from `/api/files/list`
- File operations (create, delete, rename) use corresponding API endpoints
- Target panel selection persists per FileExplorer instance
- Automatic panel creation if target doesn't exist (e.g., creates CodeEditor for files)

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
  - Alternative terminal emulation approaches## [2025-07-18] File Explorer and Code Editor Enhancements

### Added
- **Default New Panel Behavior**: File Explorer now opens files in new code editor panels by default
- **Comprehensive Editor Menu**: Full file menu with all standard operations (New, Open, Save, Save As, etc.)
- **Keyboard Shortcuts**: All menu items show their keyboard shortcuts
- **Visual Feedback**: Disabled menu items when operations aren't available

### Fixed
- SSH agent now handles missing conversations gracefully with --continue flag fallback
- File API now reads from project directory instead of /workspace
- File paths properly tracked for save operations

### Changed
- File Explorer dropdown now shows 'New Panel' as the default option
- Users can still select existing panels from the dropdown menu

