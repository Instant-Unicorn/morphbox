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
      // Only save custom panels to localStorage
      const customPanelsOnly = Array.from(state.panels.entries())
        .filter(([id, panel]) => panel.isCustom)
        .map(([id, panel]) => ({
          ...panel,
          component: null, // Don't serialize components
          createdAt: panel.createdAt.toISOString()
        }));
      
      localStorage.setItem('panel-registry', JSON.stringify(customPanelsOnly));
    },

    // Load registry from localStorage
    loadRegistry() {
      const saved = localStorage.getItem('panel-registry');
      if (!saved) return;

      try {
        const parsed = JSON.parse(saved);
        const panels = new Map<string, PanelDefinition>();
        
        // Only load custom panels from localStorage
        for (const panel of parsed) {
          if (panel.isCustom) {
            panels.set(panel.id, {
              ...panel,
              createdAt: new Date(panel.createdAt),
              component: null // Will be loaded on demand
            });
          }
        }

        // Update only with custom panels, don't replace the whole state
        update(state => {
          // Add custom panels to existing state
          for (const [id, panel] of panels) {
            state.panels.set(id, panel);
          }
          return state;
        });
      } catch (error) {
        console.error('Failed to load panel registry:', error);
        // Clear corrupted data
        localStorage.removeItem('panel-registry');
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
        },
        {
          id: 'promptQueue',
          name: 'Prompt Queue',
          description: 'Queue and manage prompts for Claude',
          path: '$lib/panels/PromptQueue/PromptQueue.svelte',
          features: ['ai', 'queue', 'automation'],
          createdAt: new Date(),
          isCustom: false
        },
        {
          id: 'webBrowser',
          name: 'Web Browser',
          description: 'Preview web pages and local servers',
          path: '$lib/panels/WebBrowser/WebBrowser.svelte',
          features: ['preview', 'browser', 'development'],
          createdAt: new Date(),
          isCustom: false
        },
        {
          id: 'gitPanel',
          name: 'Git',
          description: 'Git version control management',
          path: '$lib/panels/GitPanel/GitPanel.svelte',
          features: ['git', 'vcs', 'development'],
          createdAt: new Date(),
          isCustom: false
        },
        {
          id: 'taskRunner',
          name: 'Task Runner',
          description: 'Run npm scripts and custom commands',
          path: '$lib/panels/TaskRunner/TaskRunner.svelte',
          features: ['tasks', 'terminal', 'development'],
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
  console.log('[PanelRegistry] Initializing...');
  
  // Load custom panels from localStorage
  panelRegistry.loadRegistry();
  
  // Always initialize built-in panels (they don't persist)
  console.log('[PanelRegistry] Initializing built-in panels...');
  panelRegistry.initializeBuiltins();
  
  // Log final state
  const registry = get(panelRegistry);
  console.log('[PanelRegistry] Total panels:', registry.panels.size);
  console.log('[PanelRegistry] All panels:', Array.from(registry.panels.keys()));
  
  const builtins = get(builtinPanels);
  const customs = get(customPanels);
  console.log('[PanelRegistry] Built-in panels:', builtins.map(p => p.id));
  console.log('[PanelRegistry] Custom panels:', customs.map(p => p.id));
}