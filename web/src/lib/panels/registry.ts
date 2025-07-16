import type { ComponentType, SvelteComponent } from 'svelte';
import { writable, derived, get } from 'svelte/store';

export interface PanelDefinition {
  id: string;
  name: string;
  description: string;
  component: ComponentType<SvelteComponent> | null;
  path: string;
  features: string[];
  createdAt: Date;
  isCustom: boolean;
}

interface PanelRegistry {
  panels: Map<string, PanelDefinition>;
}

function createPanelRegistry() {
  const { subscribe, set, update } = writable<PanelRegistry>({
    panels: new Map()
  });

  return {
    subscribe,

    // Register a new panel
    register(definition: PanelDefinition) {
      update(state => {
        state.panels.set(definition.id, definition);
        return state;
      });
      
      // Save to localStorage for persistence
      this.saveRegistry();
    },

    // Unregister a panel
    unregister(id: string) {
      update(state => {
        state.panels.delete(id);
        return state;
      });
      
      this.saveRegistry();
    },

    // Get a panel definition
    get(id: string): PanelDefinition | undefined {
      const state = get({ subscribe });
      return state.panels.get(id);
    },

    // Get all panels
    getAll(): PanelDefinition[] {
      const state = get({ subscribe });
      return Array.from(state.panels.values());
    },

    // Get panels by feature
    getByFeature(feature: string): PanelDefinition[] {
      const state = get({ subscribe });
      return Array.from(state.panels.values())
        .filter(panel => panel.features.includes(feature));
    },

    // Load a panel component dynamically
    async loadComponent(id: string): Promise<ComponentType<SvelteComponent> | null> {
      const panel = this.get(id);
      if (!panel) return null;

      try {
        // Dynamic import of the panel component
        const module = await import(/* @vite-ignore */ panel.path);
        return module.default;
      } catch (error) {
        console.error(`Failed to load panel component: ${id}`, error);
        return null;
      }
    },

    // Save registry to localStorage
    saveRegistry() {
      const state = get({ subscribe });
      const serialized = Array.from(state.panels.entries()).map(([id, panel]) => ({
        ...panel,
        component: null, // Don't serialize components
        createdAt: panel.createdAt.toISOString()
      }));
      
      localStorage.setItem('panel-registry', JSON.stringify(serialized));
    },

    // Load registry from localStorage
    loadRegistry() {
      const saved = localStorage.getItem('panel-registry');
      if (!saved) return;

      try {
        const parsed = JSON.parse(saved);
        const panels = new Map<string, PanelDefinition>();
        
        for (const panel of parsed) {
          panels.set(panel.id, {
            ...panel,
            createdAt: new Date(panel.createdAt),
            component: null // Will be loaded on demand
          });
        }

        set({ panels });
      } catch (error) {
        console.error('Failed to load panel registry:', error);
      }
    },

    // Initialize with built-in panels
    initializeBuiltins() {
      const builtinPanels: Omit<PanelDefinition, 'component'>[] = [
        {
          id: 'terminal',
          name: 'Terminal',
          description: 'Interactive terminal emulator',
          path: '$lib/Terminal.svelte',
          features: ['terminal', 'websocket'],
          createdAt: new Date(),
          isCustom: false
        },
        {
          id: 'claude',
          name: 'Claude',
          description: 'Claude AI assistant',
          path: '$lib/Claude.svelte',
          features: ['terminal', 'websocket', 'ai'],
          createdAt: new Date(),
          isCustom: false
        },
        {
          id: 'fileExplorer',
          name: 'File Explorer',
          description: 'Browse and manage files',
          path: '$lib/panels/FileExplorer/FileExplorer.svelte',
          features: ['fileSystem', 'stateManagement'],
          createdAt: new Date(),
          isCustom: false
        },
        {
          id: 'codeEditor',
          name: 'Code Editor',
          description: 'Edit code with syntax highlighting',
          path: '$lib/panels/CodeEditor/CodeEditor.svelte',
          features: ['fileSystem', 'stateManagement'],
          createdAt: new Date(),
          isCustom: false
        },
        {
          id: 'settings',
          name: 'Settings',
          description: 'Application settings and preferences',
          path: '$lib/panels/Settings/Settings.svelte',
          features: ['formHandling', 'stateManagement'],
          createdAt: new Date(),
          isCustom: false
        }
      ];

      for (const panel of builtinPanels) {
        this.register({ ...panel, component: null });
      }
    }
  };
}

// Create and export the registry
export const panelRegistry = createPanelRegistry();

// Derived stores for filtered panels
export const customPanels = derived(
  panelRegistry,
  $registry => Array.from($registry.panels.values()).filter(p => p.isCustom)
);

export const builtinPanels = derived(
  panelRegistry,
  $registry => Array.from($registry.panels.values()).filter(p => !p.isCustom)
);

// Initialize registry on module load
if (typeof window !== 'undefined') {
  panelRegistry.loadRegistry();
  
  // Initialize built-in panels if registry is empty
  const registry = get(panelRegistry);
  if (registry.panels.size === 0) {
    panelRegistry.initializeBuiltins();
  }
}