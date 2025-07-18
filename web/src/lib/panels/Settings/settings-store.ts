import { writable, get } from 'svelte/store';

export interface Settings {
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
    defaultPositions: {
      terminal: { x: number; y: number; width: string; height: string };
      settings: { x: number; y: number; width: string; height: string };
      [key: string]: { x: number; y: number; width: string; height: string };
    };
    snapToGrid: boolean;
    gridSize: number;
  };
  shortcuts: {
    [action: string]: string;
  };
}

// Default settings
export const defaultSettings: Settings = {
  theme: 'dark',
  customTheme: {
    background: '#1e1e1e',
    foreground: '#d4d4d4',
    accent: '#007acc'
  },
  terminal: {
    fontSize: 14,
    fontFamily: '"Cascadia Code", "Fira Code", monospace',
    lineHeight: 1.2,
    cursorStyle: 'block',
    cursorBlink: true
  },
  panels: {
    defaultPositions: {
      terminal: { x: 0, y: 40, width: '100%', height: 'calc(100% - 62px)' },
      settings: { x: 50, y: 50, width: '600px', height: '500px' }
    },
    snapToGrid: true,
    gridSize: 10
  },
  shortcuts: {
    'toggle-terminal': 'Ctrl+`',
    'toggle-settings': 'Ctrl+,',
    'clear-terminal': 'Ctrl+L',
    'new-terminal': 'Ctrl+Shift+`',
    'close-panel': 'Escape',
    'save-settings': 'Ctrl+S'
  }
};

// Create the settings store
function createSettingsStore() {
  const { subscribe, set, update } = writable<Settings>(defaultSettings);

  return {
    subscribe,
    load: () => {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('morphbox-settings');
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            set({ ...defaultSettings, ...parsed });
          } catch (e) {
            console.error('Failed to load settings:', e);
            set(defaultSettings);
          }
        }
      }
    },
    save: () => {
      const current = get(settings);
      if (typeof window !== 'undefined') {
        localStorage.setItem('morphbox-settings', JSON.stringify(current));
      }
    },
    reset: () => {
      set(defaultSettings);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('morphbox-settings');
      }
    },
    update
  };
}

export const settings = createSettingsStore();

// Helper function to apply theme
export function applyTheme(theme: Settings['theme'], customTheme?: Settings['customTheme']) {
  if (typeof window === 'undefined') return;

  const root = document.documentElement;
  
  switch (theme) {
    case 'light':
      root.style.setProperty('--bg-color', '#f3f3f3');
      root.style.setProperty('--text-color', '#1e1e1e');
      root.style.setProperty('--border-color', '#e0e0e0');
      root.style.setProperty('--input-bg', '#ffffff');
      root.style.setProperty('--accent-color', '#0066cc');
      root.style.setProperty('--text-secondary', '#6e6e6e');
      root.style.setProperty('--surface', '#ffffff');
      root.style.setProperty('--hover-bg', '#e8e8e8');
      root.style.setProperty('--hover-border', '#d0d0d0');
      root.style.setProperty('--error-color', '#d73a49');
      root.style.setProperty('--error-bg-hover', '#ffdce0');
      root.style.setProperty('--scrollbar-thumb', '#c0c0c0');
      root.style.setProperty('--scrollbar-thumb-hover', '#a0a0a0');
      root.style.setProperty('--editor-bg', '#ffffff');
      root.style.setProperty('--text-color-bright', '#000000');
      break;
    case 'custom':
      if (customTheme) {
        root.style.setProperty('--bg-color', customTheme.background);
        root.style.setProperty('--text-color', customTheme.foreground);
        root.style.setProperty('--accent-color', customTheme.accent);
        root.style.setProperty('--surface', customTheme.surface || adjustColor(customTheme.background, 10));
        root.style.setProperty('--border-color', customTheme.border || adjustColor(customTheme.background, 20));
        // Derive other colors from the custom theme
        root.style.setProperty('--input-bg', adjustColor(customTheme.background, 10));
        root.style.setProperty('--text-secondary', adjustColor(customTheme.foreground, -40));
        root.style.setProperty('--hover-bg', adjustColor(customTheme.background, 15));
        root.style.setProperty('--hover-border', adjustColor(customTheme.border, 10));
        root.style.setProperty('--error-color', '#f48771');
        root.style.setProperty('--error-bg-hover', adjustColor('#5a1d1d', 10));
        root.style.setProperty('--scrollbar-thumb', adjustColor(customTheme.background, 30));
        root.style.setProperty('--scrollbar-thumb-hover', adjustColor(customTheme.background, 40));
        root.style.setProperty('--editor-bg', customTheme.background);
        root.style.setProperty('--text-color-bright', customTheme.foreground);
      }
      break;
    default: // dark
      root.style.setProperty('--bg-color', '#2d2d30');
      root.style.setProperty('--text-color', '#cccccc');
      root.style.setProperty('--border-color', '#3e3e42');
      root.style.setProperty('--input-bg', '#3c3c3c');
      root.style.setProperty('--accent-color', '#007acc');
      root.style.setProperty('--text-secondary', '#858585');
      root.style.setProperty('--surface', '#252526');
      root.style.setProperty('--hover-bg', '#3e3e42');
      root.style.setProperty('--hover-border', '#5a5a5c');
      root.style.setProperty('--error-color', '#f48771');
      root.style.setProperty('--error-bg-hover', '#5a1d1d');
      root.style.setProperty('--scrollbar-thumb', '#424242');
      root.style.setProperty('--scrollbar-thumb-hover', '#4e4e4e');
      root.style.setProperty('--editor-bg', '#1e1e1e');
      root.style.setProperty('--text-color-bright', '#ffffff');
  }
}

// Helper function to adjust color brightness
function adjustColor(color: string, amount: number): string {
  const hex = color.replace('#', '');
  const r = Math.max(0, Math.min(255, parseInt(hex.slice(0, 2), 16) + amount));
  const g = Math.max(0, Math.min(255, parseInt(hex.slice(2, 4), 16) + amount));
  const b = Math.max(0, Math.min(255, parseInt(hex.slice(4, 6), 16) + amount));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

// Keyboard shortcut handler
export function setupKeyboardShortcuts(shortcuts: Settings['shortcuts'], handlers: Record<string, () => void>) {
  if (typeof window === 'undefined') return;

  const handleKeydown = (event: KeyboardEvent) => {
    const keys = [];
    if (event.ctrlKey) keys.push('Ctrl');
    if (event.shiftKey) keys.push('Shift');
    if (event.altKey) keys.push('Alt');
    if (event.metaKey) keys.push('Cmd');
    
    if (event.key && !['Control', 'Shift', 'Alt', 'Meta'].includes(event.key)) {
      keys.push(event.key.length === 1 ? event.key.toUpperCase() : event.key);
    }
    
    const shortcut = keys.join('+');
    
    // Find matching action
    for (const [action, mappedShortcut] of Object.entries(shortcuts)) {
      if (mappedShortcut === shortcut && handlers[action]) {
        event.preventDefault();
        handlers[action]();
        break;
      }
    }
  };

  document.addEventListener('keydown', handleKeydown);
  
  // Return cleanup function
  return () => {
    document.removeEventListener('keydown', handleKeydown);
  };
}