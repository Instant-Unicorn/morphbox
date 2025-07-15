# Settings Panel

A comprehensive settings panel for MorphBox that allows users to customize their terminal experience.

## Features

### 1. Theme Selection
- **Dark Theme**: Default dark theme optimized for terminal use
- **Light Theme**: A bright theme for well-lit environments
- **Custom Theme**: Create your own color scheme with:
  - Background color
  - Foreground (text) color
  - Accent color

### 2. Terminal Settings
- **Font Size**: Adjustable from 10px to 24px
- **Font Family**: Choose from popular monospace fonts:
  - Cascadia Code
  - JetBrains Mono
  - Source Code Pro
  - Ubuntu Mono
  - Consolas
  - Monaco
  - Menlo
  - Generic monospace
- **Line Height**: Control spacing between lines (1.0 to 2.0)
- **Cursor Style**: Block, Underline, or Bar
- **Cursor Blink**: Toggle cursor blinking

### 3. Panel Settings
- **Snap to Grid**: Enable/disable grid snapping for panel positioning
- **Grid Size**: Adjustable grid size (5px to 50px)
- **Default Positions**: Configure default positions for each panel

### 4. Keyboard Shortcuts
- Fully customizable keyboard shortcuts
- Click on any shortcut field and press the desired key combination
- Default shortcuts:
  - `Ctrl+,`: Toggle settings panel
  - `Ctrl+L`: Clear terminal
  - `Ctrl+Shift+``: New terminal
  - `Escape`: Close current panel
  - `Ctrl+S`: Save settings

### 5. Import/Export Settings
- Export your settings to a JSON file
- Import settings from a previously exported file
- Share your configuration across devices

## Usage

### Opening the Settings Panel
1. Click the "Settings" button in the header
2. Or press `Ctrl+,` (customizable)

### Applying Settings
1. Make your desired changes
2. Click "Save Settings" or press `Ctrl+S`
3. Settings are automatically persisted to localStorage

### Dragging the Panel
- Click and drag the settings panel header to reposition it
- Enable "Snap to Grid" for aligned positioning

### Reset to Defaults
- Click "Reset to Defaults" to restore all settings to their original values
- You'll be prompted to confirm this action

## Technical Details

### Storage
Settings are stored in localStorage under the key `morphbox-settings`.

### Settings Structure
```typescript
interface Settings {
  theme: 'dark' | 'light' | 'custom';
  customTheme?: {
    background: string;
    foreground: string;
    accent: string;
  };
  terminal: {
    fontSize: number;
    fontFamily: string;
    lineHeight: number;
    cursorStyle: 'block' | 'underline' | 'bar';
    cursorBlink: boolean;
  };
  panels: {
    defaultPositions: { [key: string]: Position };
    snapToGrid: boolean;
    gridSize: number;
  };
  shortcuts: { [action: string]: string };
}
```

### Integration
The settings panel integrates with:
- Terminal component for real-time updates
- Theme system for application-wide styling
- Keyboard shortcut handler for global shortcuts

## Components

- `Settings.svelte`: Main settings panel component
- `settings-store.ts`: Svelte store for settings management
- `index.ts`: Export barrel file