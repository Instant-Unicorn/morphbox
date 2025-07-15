/**
 * Enhanced Panel Store with State Preservation and Hot Reload Recovery
 * 
 * Features:
 * - State preservation to sessionStorage (survives hot reloads but not browser closes)
 * - Hot reload recovery that restores panels after HMR
 * - Terminal persistence flag to prevent terminal destruction during hot reloads
 * - Panel state snapshot and restore functions
 * - beforeunload event handling to save critical state
 * - WebSocket connection preservation across hot reloads
 * - Automatic state saving with debouncing
 * - Vite HMR integration for development
 */

import { writable, derived, get } from 'svelte/store';
import { browser } from '$app/environment';

// Panel interface
export interface Panel {
  id: string;
  type: string;
  title: string;
  position: {
    x: number;
    y: number;
  };
  size: {
    width: number;
    height: number;
  };
  persistent: boolean;
  zIndex?: number;
  minimized?: boolean;
  maximized?: boolean;
  content?: any; // Additional content/state specific to panel type
  terminalPersistent?: boolean; // Prevents terminal from being destroyed during hot reloads
  websocketConnections?: Map<string, WebSocket>; // Store websocket connections for persistence
}

// Layout modes
export type PanelLayout = 'grid' | 'split' | 'tabs' | 'floating';

// Panel store state
interface PanelState {
  panels: Panel[];
  layout: PanelLayout;
  activePanel: string | null;
  hotReloadRecovery?: boolean; // Flag to indicate if recovering from hot reload
  lastSavedAt?: number; // Timestamp of last state save
}

// State preservation keys
const SESSION_STORAGE_KEY = 'morphbox-panel-state';
const CRITICAL_STATE_KEY = 'morphbox-critical-panel-state';
const HOT_RELOAD_MARKER = 'morphbox-hot-reload-marker';

// Default panel configurations
export const defaultPanelConfigs: Record<string, Partial<Panel>> = {
  terminal: {
    type: 'terminal',
    title: 'Terminal',
    size: { width: 800, height: 400 },
    persistent: true,
    terminalPersistent: true
  },
  fileExplorer: {
    type: 'fileExplorer',
    title: 'File Explorer',
    size: { width: 300, height: 600 },
    persistent: true
  },
  editor: {
    type: 'editor',
    title: 'Editor',
    size: { width: 800, height: 600 },
    persistent: false
  },
  preview: {
    type: 'preview',
    title: 'Preview',
    size: { width: 600, height: 500 },
    persistent: false
  },
  settings: {
    type: 'settings',
    title: 'Settings',
    size: { width: 600, height: 400 },
    persistent: false
  }
};

// State preservation utilities
function saveStateToSessionStorage(state: PanelState): void {
  if (!browser) return;
  
  try {
    // Create serializable state (remove websocket connections for serialization)
    const serializableState = {
      ...state,
      panels: state.panels.map(panel => ({
        ...panel,
        websocketConnections: undefined // Remove non-serializable websocket connections
      })),
      lastSavedAt: Date.now()
    };
    
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(serializableState));
    
    // Save critical state separately for terminal persistence
    const criticalState = {
      terminalPanels: state.panels.filter(p => p.type === 'terminal' && p.terminalPersistent),
      activePanel: state.activePanel,
      layout: state.layout,
      lastSavedAt: Date.now()
    };
    
    sessionStorage.setItem(CRITICAL_STATE_KEY, JSON.stringify(criticalState));
    
    // Mark that we're in a potential hot reload scenario
    sessionStorage.setItem(HOT_RELOAD_MARKER, Date.now().toString());
  } catch (error) {
    console.warn('Failed to save panel state to sessionStorage:', error);
  }
}

function loadStateFromSessionStorage(): PanelState | null {
  if (!browser) return null;
  
  try {
    const savedState = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!savedState) return null;
    
    const state = JSON.parse(savedState) as PanelState;
    
    // Check if this is a hot reload recovery
    const hotReloadMarker = sessionStorage.getItem(HOT_RELOAD_MARKER);
    const isHotReload = hotReloadMarker && (Date.now() - parseInt(hotReloadMarker)) < 5000; // 5 second window
    
    return {
      ...state,
      hotReloadRecovery: isHotReload,
      panels: state.panels.map(panel => ({
        ...panel,
        websocketConnections: new Map() // Initialize empty websocket connections map
      }))
    };
  } catch (error) {
    console.warn('Failed to load panel state from sessionStorage:', error);
    return null;
  }
}

interface CriticalState {
  terminalPanels: Panel[];
  activePanel: string | null;
  layout: PanelLayout;
  lastSavedAt: number;
}

function loadCriticalState(): CriticalState | null {
  if (!browser) return null;
  
  try {
    const criticalState = sessionStorage.getItem(CRITICAL_STATE_KEY);
    if (!criticalState) return null;
    
    return JSON.parse(criticalState) as CriticalState;
  } catch (error) {
    console.warn('Failed to load critical panel state:', error);
    return null;
  }
}

function clearHotReloadMarker(): void {
  if (!browser) return;
  sessionStorage.removeItem(HOT_RELOAD_MARKER);
}

// WebSocket connection preservation utilities
function preserveWebSocketConnection(panelId: string, connectionId: string, websocket: WebSocket): void {
  // Store websocket reference in a global registry for hot reload recovery
  if (browser && (window as any).__morphboxWebSockets) {
    (window as any).__morphboxWebSockets[`${panelId}-${connectionId}`] = websocket;
  }
}

function restoreWebSocketConnection(panelId: string, connectionId: string): WebSocket | null {
  if (browser && (window as any).__morphboxWebSockets) {
    return (window as any).__morphboxWebSockets[`${panelId}-${connectionId}`] || null;
  }
  return null;
}

// Initialize global websocket registry
if (browser && !(window as any).__morphboxWebSockets) {
  (window as any).__morphboxWebSockets = {};
}

// Panel state snapshot and restore functions
export function createPanelSnapshot(state: PanelState): string {
  try {
    const snapshot = {
      panels: state.panels.map(panel => ({
        ...panel,
        websocketConnections: undefined // Remove non-serializable data
      })),
      layout: state.layout,
      activePanel: state.activePanel,
      timestamp: Date.now()
    };
    return JSON.stringify(snapshot);
  } catch (error) {
    console.error('Failed to create panel snapshot:', error);
    return '';
  }
}

export function restorePanelSnapshot(snapshotData: string): PanelState | null {
  try {
    const snapshot = JSON.parse(snapshotData);
    return {
      panels: snapshot.panels.map((panel: Panel) => ({
        ...panel,
        websocketConnections: new Map()
      })),
      layout: snapshot.layout || 'floating',
      activePanel: snapshot.activePanel || null
    };
  } catch (error) {
    console.error('Failed to restore panel snapshot:', error);
    return null;
  }
}

// Create the main store
function createPanelStore() {
  // Try to restore state from sessionStorage first
  const restoredState = loadStateFromSessionStorage();
  
  // Filter out FileExplorer panels if they exist in restored state
  if (restoredState && restoredState.panels) {
    restoredState.panels = restoredState.panels.filter(p => p.type !== 'fileExplorer');
    if (restoredState.panels.length === 0) {
      // If no panels left after filtering, set to null to use defaults
      restoredState.panels = [];
    }
  }
  
  const initialState: PanelState = restoredState || {
    panels: [],
    layout: 'floating',
    activePanel: null
  };

  const { subscribe, set, update } = writable<PanelState>(initialState);

  // Auto-save state changes to sessionStorage
  if (browser) {
    // Debounced save function to avoid excessive writes
    let saveTimeout: NodeJS.Timeout;
    const debouncedSave = (state: PanelState) => {
      clearTimeout(saveTimeout);
      saveTimeout = setTimeout(() => {
        saveStateToSessionStorage(state);
      }, 100);
    };

    // Subscribe to state changes for auto-saving
    subscribe(debouncedSave);
  }

  // Generate unique ID
  const generateId = () => `panel-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Calculate next position (cascade effect)
  const getNextPosition = (panels: Panel[]) => {
    const baseX = 50;
    const baseY = 50;
    const offset = 30;
    const count = panels.length;
    
    return {
      x: baseX + (count * offset) % 300,
      y: baseY + (count * offset) % 200
    };
  };

  // Get highest z-index
  const getHighestZIndex = (panels: Panel[]) => {
    return Math.max(0, ...panels.map(p => p.zIndex || 0));
  };

  return {
    subscribe,

    // Add a new panel
    addPanel: (type: string, config?: Partial<Panel>) => {
      update(state => {
        const defaultConfig = defaultPanelConfigs[type] || {};
        const id = generateId();
        const position = config?.position || getNextPosition(state.panels);
        const zIndex = getHighestZIndex(state.panels) + 1;

        const newPanel: Panel = {
          id,
          type,
          title: 'Untitled',
          position,
          size: { width: 400, height: 300 },
          persistent: false,
          zIndex,
          ...defaultConfig,
          ...config
        };

        return {
          ...state,
          panels: [...state.panels, newPanel],
          activePanel: id
        };
      });
    },

    // Remove a panel
    removePanel: (id: string) => {
      update(state => ({
        ...state,
        panels: state.panels.filter(p => p.id !== id),
        activePanel: state.activePanel === id ? null : state.activePanel
      }));
    },

    // Update a panel
    updatePanel: (id: string, updates: Partial<Panel>) => {
      update(state => ({
        ...state,
        panels: state.panels.map(p => 
          p.id === id ? { ...p, ...updates } : p
        )
      }));
    },

    // Set active panel (bring to front)
    setActivePanel: (id: string | null) => {
      update(state => {
        if (!id) return { ...state, activePanel: null };
        
        const highestZ = getHighestZIndex(state.panels);
        const panels = state.panels.map(p => 
          p.id === id ? { ...p, zIndex: highestZ + 1 } : p
        );

        return {
          ...state,
          panels,
          activePanel: id
        };
      });
    },

    // Toggle minimize
    toggleMinimize: (id: string) => {
      update(state => ({
        ...state,
        panels: state.panels.map(p => 
          p.id === id ? { ...p, minimized: !p.minimized, maximized: false } : p
        )
      }));
    },

    // Toggle maximize
    toggleMaximize: (id: string) => {
      update(state => ({
        ...state,
        panels: state.panels.map(p => 
          p.id === id ? { ...p, maximized: !p.maximized, minimized: false } : p
        )
      }));
    },

    // Set layout mode
    setLayout: (layout: PanelLayout) => {
      update(state => ({ ...state, layout }));
    },

    // Clear all panels
    clearPanels: () => {
      update(state => ({
        ...state,
        panels: state.panels.filter(p => p.persistent),
        activePanel: null
      }));
    },

    // Save configuration to localStorage
    saveConfiguration: (name: string = 'default') => {
      const state = get({ subscribe });
      const config = {
        panels: state.panels,
        layout: state.layout
      };
      
      localStorage.setItem(`panel-config-${name}`, JSON.stringify(config));
    },

    // Load configuration from localStorage
    loadConfiguration: (name: string = 'default') => {
      const saved = localStorage.getItem(`panel-config-${name}`);
      if (saved) {
        try {
          const config = JSON.parse(saved);
          set({
            panels: config.panels || [],
            layout: config.layout || 'floating',
            activePanel: null
          });
          return true;
        } catch (e) {
          console.error('Failed to load panel configuration:', e);
          return false;
        }
      }
      return false;
    },

    // Get all saved configurations
    getSavedConfigurations: () => {
      const configs: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('panel-config-')) {
          configs.push(key.replace('panel-config-', ''));
        }
      }
      return configs;
    },

    // Delete a saved configuration
    deleteConfiguration: (name: string) => {
      localStorage.removeItem(`panel-config-${name}`);
    },

    // Initialize with default panels
    initializeDefaults: () => {
      update(state => {
        if (state.panels.length > 0) return state;

        const defaultPanels: Panel[] = [
          {
            ...defaultPanelConfigs.terminal,
            id: generateId(),
            position: { x: 340, y: 440 }
          } as Panel
        ];

        return {
          ...state,
          panels: defaultPanels,
          activePanel: defaultPanels[0].id
        };
      });
    },

    // Hot reload recovery methods
    recoverFromHotReload: () => {
      const criticalState = loadCriticalState();
      if (criticalState && criticalState.terminalPanels) {
        update(state => {
          // Merge terminal panels back if they were lost
          const existingTerminalIds = new Set(
            state.panels.filter(p => p.type === 'terminal').map(p => p.id)
          );
          
          const missingTerminals = criticalState.terminalPanels.filter(
            (panel: Panel) => !existingTerminalIds.has(panel.id)
          );

          return {
            ...state,
            panels: [...state.panels, ...missingTerminals],
            hotReloadRecovery: false
          };
        });
      }
      clearHotReloadMarker();
    },

    // Terminal persistence methods
    setTerminalPersistence: (id: string, persistent: boolean) => {
      update(state => ({
        ...state,
        panels: state.panels.map(p => 
          p.id === id ? { ...p, terminalPersistent: persistent } : p
        )
      }));
    },

    // WebSocket connection management
    preserveWebSocket: (panelId: string, connectionId: string, websocket: WebSocket) => {
      preserveWebSocketConnection(panelId, connectionId, websocket);
      
      update(state => ({
        ...state,
        panels: state.panels.map(p => {
          if (p.id === panelId) {
            const connections = p.websocketConnections || new Map();
            connections.set(connectionId, websocket);
            return { ...p, websocketConnections: connections };
          }
          return p;
        })
      }));
    },

    restoreWebSocket: (panelId: string, connectionId: string): WebSocket | null => {
      return restoreWebSocketConnection(panelId, connectionId);
    },

    // State snapshot methods
    createSnapshot: (): string => {
      const state = get({ subscribe });
      return createPanelSnapshot(state);
    },

    restoreSnapshot: (snapshotData: string): boolean => {
      const restoredState = restorePanelSnapshot(snapshotData);
      if (restoredState) {
        set(restoredState);
        return true;
      }
      return false;
    },

    // Manual state preservation
    saveState: () => {
      const state = get({ subscribe });
      saveStateToSessionStorage(state);
    },

    // Clear all state
    clearState: () => {
      if (browser) {
        sessionStorage.removeItem(SESSION_STORAGE_KEY);
        sessionStorage.removeItem(CRITICAL_STATE_KEY);
        sessionStorage.removeItem(HOT_RELOAD_MARKER);
      }
    },

    // Check if recovering from hot reload
    isRecoveringFromHotReload: (): boolean => {
      const state = get({ subscribe });
      return state.hotReloadRecovery || false;
    }
  };
}

// Create and export the store
export const panelStore = createPanelStore();

// Create derived stores for easier access
export const panels = derived(panelStore, $store => $store.panels);
export const activePanel = derived(panelStore, $store => 
  $store.panels.find(p => p.id === $store.activePanel) || null
);
export const panelsByType = derived(panelStore, $store => {
  const byType: Record<string, Panel[]> = {};
  $store.panels.forEach(panel => {
    if (!byType[panel.type]) byType[panel.type] = [];
    byType[panel.type].push(panel);
  });
  return byType;
});
export const visiblePanels = derived(panelStore, $store => 
  $store.panels.filter(p => !p.minimized)
);

// Export storage utilities for external use
export const storageKeys = {
  SESSION_STORAGE_KEY,
  CRITICAL_STATE_KEY,
  HOT_RELOAD_MARKER
};

export const panelStateUtils = {
  saveStateToSessionStorage,
  loadStateFromSessionStorage,
  loadCriticalState,
  clearHotReloadMarker,
  preserveWebSocketConnection,
  restoreWebSocketConnection,
  createPanelSnapshot,
  restorePanelSnapshot
};

// Setup beforeunload event handling for critical state preservation
if (browser) {
  // Save critical state before page unload
  const handleBeforeUnload = () => {
    const state = get(panelStore);
    
    // Save critical state immediately before unload
    try {
      const criticalState = {
        terminalPanels: state.panels.filter(p => p.type === 'terminal' && p.terminalPersistent),
        activePanel: state.activePanel,
        layout: state.layout,
        lastSavedAt: Date.now()
      };
      
      sessionStorage.setItem(CRITICAL_STATE_KEY, JSON.stringify(criticalState));
      
      // Clear hot reload marker since this is a real page unload
      sessionStorage.removeItem(HOT_RELOAD_MARKER);
    } catch (error) {
      console.warn('Failed to save critical state on beforeunload:', error);
    }
  };

  // Add event listeners
  window.addEventListener('beforeunload', handleBeforeUnload);
  
  // For development: handle Vite HMR events
  if (typeof import.meta !== 'undefined' && (import.meta as any).hot) {
    const hot = (import.meta as any).hot;
    hot.on('vite:beforeUpdate', () => {
      // Mark that a hot reload is happening
      sessionStorage.setItem(HOT_RELOAD_MARKER, Date.now().toString());
      panelStore.saveState();
    });
    
    hot.on('vite:afterUpdate', () => {
      // Attempt to recover state after hot reload
      setTimeout(() => {
        if (panelStore.isRecoveringFromHotReload()) {
          panelStore.recoverFromHotReload();
        }
      }, 100);
    });
  }
  
  // Cleanup function for the beforeunload listener
  const cleanup = () => {
    window.removeEventListener('beforeunload', handleBeforeUnload);
  };
  
  // Export cleanup function for potential manual cleanup
  (panelStore as any).cleanup = cleanup;
}

// Layout-specific helpers
export const layoutConfig = {
  grid: {
    columns: 3,
    gap: 10,
    padding: 20
  },
  split: {
    dividerSize: 4,
    minPaneSize: 100
  },
  tabs: {
    headerHeight: 40,
    padding: 10
  }
};

// Utility functions for layout calculations
export function calculateGridPosition(index: number, containerWidth: number) {
  const { columns, gap, padding } = layoutConfig.grid;
  const panelWidth = (containerWidth - padding * 2 - gap * (columns - 1)) / columns;
  const row = Math.floor(index / columns);
  const col = index % columns;
  
  return {
    x: padding + col * (panelWidth + gap),
    y: padding + row * (panelWidth + gap),
    width: panelWidth,
    height: panelWidth
  };
}

export function calculateSplitSizes(panels: Panel[], direction: 'horizontal' | 'vertical', containerSize: number) {
  const count = panels.length;
  if (count === 0) return [];
  
  const { dividerSize } = layoutConfig.split;
  const totalDividerSize = (count - 1) * dividerSize;
  const availableSize = containerSize - totalDividerSize;
  const panelSize = availableSize / count;
  
  return panels.map((panel, index) => ({
    ...panel,
    position: direction === 'horizontal' 
      ? { x: index * (panelSize + dividerSize), y: 0 }
      : { x: 0, y: index * (panelSize + dividerSize) },
    size: direction === 'horizontal'
      ? { width: panelSize, height: containerSize }
      : { width: containerSize, height: panelSize }
  }));
}

