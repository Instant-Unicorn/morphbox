import { writable, derived, get } from 'svelte/store';
import { panelStore as panels } from './panels';
import { panelRegistry } from '../panels/registry';

export interface Command {
  id: string;
  title: string;
  description: string;
  category: string;
  keywords: string[];
  action: () => void | Promise<void>;
  shortcut?: string;
  icon?: string;
  disabled?: boolean;
}

export interface RecentCommand {
  commandId: string;
  executedAt: Date;
  count: number;
}

interface CommandState {
  commands: Map<string, Command>;
  recentCommands: RecentCommand[];
  isVisible: boolean;
}

// Fuzzy search scoring function
function fuzzyScore(query: string, text: string): number {
  if (!query) return 1;
  
  const queryLower = query.toLowerCase();
  const textLower = text.toLowerCase();
  
  // Exact match gets highest score
  if (textLower === queryLower) return 100;
  
  // Contains exact query gets high score
  if (textLower.includes(queryLower)) return 80;
  
  // Fuzzy matching
  let score = 0;
  let queryIndex = 0;
  let lastMatchIndex = -1;
  
  for (let i = 0; i < textLower.length && queryIndex < queryLower.length; i++) {
    if (textLower[i] === queryLower[queryIndex]) {
      score += 1;
      
      // Bonus for consecutive matches
      if (i === lastMatchIndex + 1) {
        score += 5;
      }
      
      // Bonus for matches at word boundaries
      if (i === 0 || textLower[i - 1] === ' ') {
        score += 10;
      }
      
      lastMatchIndex = i;
      queryIndex++;
    }
  }
  
  // Only return score if all query characters were matched
  return queryIndex === queryLower.length ? score : 0;
}

function createCommandStore() {
  const { subscribe, set, update } = writable<CommandState>({
    commands: new Map(),
    recentCommands: [],
    isVisible: false
  });

  // Load recent commands from localStorage
  const loadRecentCommands = (): RecentCommand[] => {
    try {
      const saved = localStorage.getItem('command-palette-recent');
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.map((cmd: any) => ({
          ...cmd,
          executedAt: new Date(cmd.executedAt)
        }));
      }
    } catch (error) {
      console.error('Failed to load recent commands:', error);
    }
    return [];
  };

  // Save recent commands to localStorage
  const saveRecentCommands = (recentCommands: RecentCommand[]) => {
    try {
      localStorage.setItem('command-palette-recent', JSON.stringify(recentCommands));
    } catch (error) {
      console.error('Failed to save recent commands:', error);
    }
  };

  return {
    subscribe,

    // Register a command
    register: (command: Command) => {
      update(state => {
        state.commands.set(command.id, command);
        return state;
      });
    },

    // Unregister a command
    unregister: (commandId: string) => {
      update(state => {
        state.commands.delete(commandId);
        return state;
      });
    },

    // Search commands with fuzzy matching
    search: (query: string): Command[] => {
      const state = get({ subscribe });
      const commands = Array.from(state.commands.values());
      
      if (!query.trim()) {
        // If no query, return recent commands first, then all commands
        const recentCommandIds = new Set(state.recentCommands.map(rc => rc.commandId));
        const recentCommands = commands.filter(cmd => recentCommandIds.has(cmd.id));
        const otherCommands = commands.filter(cmd => !recentCommandIds.has(cmd.id));
        
        // Sort recent commands by usage count and recency
        recentCommands.sort((a, b) => {
          const aRecent = state.recentCommands.find(rc => rc.commandId === a.id)!;
          const bRecent = state.recentCommands.find(rc => rc.commandId === b.id)!;
          
          // First by count, then by recency
          if (aRecent.count !== bRecent.count) {
            return bRecent.count - aRecent.count;
          }
          return bRecent.executedAt.getTime() - aRecent.executedAt.getTime();
        });
        
        return [...recentCommands, ...otherCommands];
      }

      // Score each command
      const scoredCommands = commands
        .map(command => {
          const titleScore = fuzzyScore(query, command.title);
          const descScore = fuzzyScore(query, command.description);
          const categoryScore = fuzzyScore(query, command.category);
          const keywordScore = Math.max(...command.keywords.map(k => fuzzyScore(query, k)), 0);
          
          const maxScore = Math.max(titleScore, descScore, categoryScore, keywordScore);
          
          return {
            command,
            score: maxScore
          };
        })
        .filter(item => item.score > 0)
        .sort((a, b) => {
          // First by score, then by recent usage
          if (a.score !== b.score) {
            return b.score - a.score;
          }
          
          const aRecent = state.recentCommands.find(rc => rc.commandId === a.command.id);
          const bRecent = state.recentCommands.find(rc => rc.commandId === b.command.id);
          
          if (aRecent && !bRecent) return -1;
          if (!aRecent && bRecent) return 1;
          if (aRecent && bRecent) {
            return bRecent.executedAt.getTime() - aRecent.executedAt.getTime();
          }
          
          return a.command.title.localeCompare(b.command.title);
        });

      return scoredCommands.map(item => item.command);
    },

    // Execute a command
    execute: async (commandId: string) => {
      const state = get({ subscribe });
      const command = state.commands.get(commandId);
      
      if (!command || command.disabled) return;

      try {
        await command.action();
        
        // Update recent commands
        update(currentState => {
          const now = new Date();
          const existingIndex = currentState.recentCommands.findIndex(rc => rc.commandId === commandId);
          
          if (existingIndex >= 0) {
            // Update existing recent command
            currentState.recentCommands[existingIndex].executedAt = now;
            currentState.recentCommands[existingIndex].count += 1;
          } else {
            // Add new recent command
            currentState.recentCommands.push({
              commandId,
              executedAt: now,
              count: 1
            });
          }
          
          // Keep only the most recent 50 commands
          currentState.recentCommands.sort((a, b) => b.executedAt.getTime() - a.executedAt.getTime());
          if (currentState.recentCommands.length > 50) {
            currentState.recentCommands = currentState.recentCommands.slice(0, 50);
          }
          
          saveRecentCommands(currentState.recentCommands);
          return currentState;
        });
        
      } catch (error) {
        console.error(`Failed to execute command ${commandId}:`, error);
      }
    },

    // Show/hide command palette
    show: () => {
      update(state => ({ ...state, isVisible: true }));
    },

    hide: () => {
      update(state => ({ ...state, isVisible: false }));
    },

    toggle: () => {
      update(state => ({ ...state, isVisible: !state.isVisible }));
    },

    // Clear recent commands
    clearRecentCommands: () => {
      update(state => {
        state.recentCommands = [];
        saveRecentCommands([]);
        return state;
      });
    },

    // Initialize with default commands
    initializeDefaults: () => {
      const defaultCommands: Command[] = [
        // Panel management commands
        {
          id: 'panel.create.terminal',
          title: 'Create Terminal Panel',
          description: 'Create a new terminal panel',
          category: 'Panel',
          keywords: ['terminal', 'console', 'shell', 'create', 'new'],
          action: () => panels.addPanel('terminal'),
          icon: '💻'
        },
        {
          id: 'panel.create.fileExplorer',
          title: 'Create File Explorer Panel',
          description: 'Create a new file explorer panel',
          category: 'Panel',
          keywords: ['file', 'explorer', 'browser', 'create', 'new'],
          action: () => panels.addPanel('fileExplorer'),
          icon: '📁'
        },
        {
          id: 'panel.create.editor',
          title: 'Create Code Editor Panel',
          description: 'Create a new code editor panel',
          category: 'Panel',
          keywords: ['editor', 'code', 'text', 'create', 'new'],
          action: () => panels.addPanel('editor'),
          icon: '📝'
        },
        {
          id: 'panel.create.settings',
          title: 'Create Settings Panel',
          description: 'Create a new settings panel',
          category: 'Panel',
          keywords: ['settings', 'preferences', 'config', 'create', 'new'],
          action: () => panels.addPanel('settings'),
          icon: '⚙️'
        },
        {
          id: 'panel.closeAll',
          title: 'Close All Panels',
          description: 'Close all non-persistent panels',
          category: 'Panel',
          keywords: ['close', 'all', 'panels', 'clear'],
          action: () => panels.clearPanels(),
          icon: '❌'
        },
        // Layout commands
        {
          id: 'layout.floating',
          title: 'Set Floating Layout',
          description: 'Set panel layout to floating mode',
          category: 'Layout',
          keywords: ['layout', 'floating', 'free', 'mode'],
          action: () => panels.setLayout('floating'),
          icon: '🪟'
        },
        {
          id: 'layout.grid',
          title: 'Set Grid Layout',
          description: 'Set panel layout to grid mode',
          category: 'Layout',
          keywords: ['layout', 'grid', 'organized', 'mode'],
          action: () => panels.setLayout('grid'),
          icon: '⊞'
        },
        {
          id: 'layout.split',
          title: 'Set Split Layout',
          description: 'Set panel layout to split mode',
          category: 'Layout',
          keywords: ['layout', 'split', 'pane', 'mode'],
          action: () => panels.setLayout('split'),
          icon: '⊟'
        },
        {
          id: 'layout.tabs',
          title: 'Set Tab Layout',
          description: 'Set panel layout to tabs mode',
          category: 'Layout',
          keywords: ['layout', 'tabs', 'tabbed', 'mode'],
          action: () => panels.setLayout('tabs'),
          icon: '📑'
        },
        // Configuration commands
        {
          id: 'config.save',
          title: 'Save Configuration',
          description: 'Save current panel configuration',
          category: 'Configuration',
          keywords: ['save', 'config', 'configuration', 'persist'],
          action: () => panels.saveConfiguration(),
          icon: '💾'
        },
        {
          id: 'config.load',
          title: 'Load Configuration',
          description: 'Load saved panel configuration',
          category: 'Configuration',
          keywords: ['load', 'config', 'configuration', 'restore'],
          action: () => panels.loadConfiguration(),
          icon: '📥'
        },
        {
          id: 'config.clear',
          title: 'Clear Panel State',
          description: 'Clear all panels and reset to default terminal',
          category: 'Configuration',
          keywords: ['clear', 'reset', 'panels', 'state', 'default'],
          action: () => panels.clearState(),
          icon: '🔄'
        },
        // Help commands
        {
          id: 'help.commands',
          title: 'Show All Commands',
          description: 'Display all available commands',
          category: 'Help',
          keywords: ['help', 'commands', 'list', 'show'],
          action: () => console.log('All commands displayed in palette'),
          icon: '❓'
        },
        {
          id: 'help.shortcuts',
          title: 'Show Keyboard Shortcuts',
          description: 'Display keyboard shortcuts reference',
          category: 'Help',
          keywords: ['help', 'shortcuts', 'keyboard', 'hotkeys'],
          action: () => alert('Ctrl+Shift+P: Open Command Palette\nEsc: Close Command Palette\nArrow Keys: Navigate\nEnter: Execute'),
          icon: '⌨️'
        }
      ];

      // Register all default commands
      defaultCommands.forEach(command => {
        update(state => {
          state.commands.set(command.id, command);
          return state;
        });
      });

      // Load recent commands
      update(state => {
        state.recentCommands = loadRecentCommands();
        return state;
      });
    }
  };
}

// Create and export the store
export const commands = createCommandStore();

// Derived stores
export const visibleCommands = derived(
  commands,
  $commands => Array.from($commands.commands.values()).filter(cmd => !cmd.disabled)
);

export const commandsByCategory = derived(
  commands,
  $commands => {
    const grouped: Record<string, Command[]> = {};
    Array.from($commands.commands.values()).forEach(command => {
      if (!grouped[command.category]) grouped[command.category] = [];
      grouped[command.category].push(command);
    });
    return grouped;
  }
);

export const recentCommands = derived(
  commands,
  $commands => $commands.recentCommands
);

export const isCommandPaletteVisible = derived(
  commands,
  $commands => $commands.isVisible
);

// Initialize commands on module load
if (typeof window !== 'undefined') {
  commands.initializeDefaults();
}