import { writable, derived } from 'svelte/store';
import { panelStore, type Panel } from './panels';

interface FileTargetState {
  // Map of FileExplorer panel ID to target panel ID
  targets: Record<string, string>;
}

function createFileTargetStore() {
  const { subscribe, update, set } = writable<FileTargetState>({
    targets: {}
  });

  return {
    subscribe,

    // Set the target panel for a file explorer
    setTarget: (fileExplorerId: string, targetPanelId: string) => {
      update(state => ({
        ...state,
        targets: {
          ...state.targets,
          [fileExplorerId]: targetPanelId
        }
      }));
    },

    // Get the target panel for a file explorer
    getTarget: (fileExplorerId: string): string | null => {
      let target: string | null = null;
      subscribe(state => {
        target = state.targets[fileExplorerId] || null;
      })();
      return target;
    },

    // Clear target for a file explorer
    clearTarget: (fileExplorerId: string) => {
      update(state => {
        const { [fileExplorerId]: _, ...rest } = state.targets;
        return { targets: rest };
      });
    },

    // Clear all targets
    clearAll: () => {
      set({ targets: {} });
    }
  };
}

export const fileTargetStore = createFileTargetStore();

// Derived store to get available target panels (panels that can open files)
export const availableTargets = derived(panelStore, $panelStore => {
  return $panelStore.panels.filter(panel => 
    panel.type === 'editor' || 
    panel.type === 'preview' || 
    panel.type === 'terminal' ||
    panel.type === 'claude'
  );
});

// Helper function to get the target panel for a file explorer
export function getFileTarget(fileExplorerId: string): Panel | null {
  const targetId = fileTargetStore.getTarget(fileExplorerId);
  if (!targetId) return null;

  let targetPanel: Panel | null = null;
  panelStore.subscribe(state => {
    targetPanel = state.panels.find(p => p.id === targetId) || null;
  })();

  return targetPanel;
}

// Helper function to get the default target panel (first available editor)
export function getDefaultTarget(): Panel | null {
  let defaultPanel: Panel | null = null;
  
  availableTargets.subscribe(panels => {
    // Prefer editors, then preview, then terminal
    defaultPanel = panels.find(p => p.type === 'editor') ||
                   panels.find(p => p.type === 'preview') ||
                   panels.find(p => p.type === 'terminal') ||
                   panels[0] ||
                   null;
  })();

  return defaultPanel;
}