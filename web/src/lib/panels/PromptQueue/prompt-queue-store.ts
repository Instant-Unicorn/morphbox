import { writable, derived, get } from 'svelte/store';

export interface PromptItem {
  id: string;
  text: string;
  status: 'pending' | 'active' | 'completed';
  createdAt: Date;
}

interface PromptQueueState {
  items: PromptItem[];
  isRunning: boolean;
  currentPromptId: string | null;
}

function createPromptQueueStore() {
  const { subscribe, set, update } = writable<PromptQueueState>({
    items: [],
    isRunning: false,
    currentPromptId: null
  });

  // Load from localStorage on initialization
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('morphbox-prompt-queue');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        set({
          items: parsed.items.map((item: any) => ({
            ...item,
            createdAt: new Date(item.createdAt)
          })),
          isRunning: false, // Always start stopped
          currentPromptId: null
        });
      } catch (e) {
        console.error('Failed to load prompt queue:', e);
      }
    }
  }

  // Save to localStorage on changes
  subscribe(state => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('morphbox-prompt-queue', JSON.stringify({
        items: state.items.map(item => ({
          ...item,
          createdAt: item.createdAt.toISOString()
        }))
      }));
    }
  });

  return {
    subscribe,
    
    addPrompt(text: string) {
      if (!text.trim()) return;
      
      update(state => ({
        ...state,
        items: [...state.items, {
          id: `prompt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          text: text.trim(),
          status: 'pending',
          createdAt: new Date()
        }]
      }));
    },

    removePrompt(id: string) {
      update(state => ({
        ...state,
        items: state.items.filter(item => item.id !== id),
        currentPromptId: state.currentPromptId === id ? null : state.currentPromptId
      }));
    },

    updatePrompt(id: string, text: string) {
      update(state => ({
        ...state,
        items: state.items.map(item => 
          item.id === id ? { ...item, text: text.trim() } : item
        )
      }));
    },

    setPromptStatus(id: string, status: PromptItem['status']) {
      update(state => ({
        ...state,
        items: state.items.map(item => 
          item.id === id ? { ...item, status } : item
        ),
        currentPromptId: status === 'active' ? id : 
          (state.currentPromptId === id ? null : state.currentPromptId)
      }));
    },

    start() {
      update(state => ({ ...state, isRunning: true }));
    },

    stop() {
      update(state => ({
        ...state,
        isRunning: false,
        currentPromptId: null,
        items: state.items.map(item => ({
          ...item,
          // Reset active prompts to pending so they can be re-run if needed
          // Keep completed prompts as-is so user can see what was done
          status: item.status === 'active' ? 'pending' : item.status
        }))
      }));
    },

    getNextPending(): PromptItem | null {
      const state = get({ subscribe });
      return state.items.find(item => item.status === 'pending') || null;
    },

    removeCompleted() {
      update(state => ({
        ...state,
        items: state.items.filter(item => item.status !== 'completed')
      }));
    },

    clear() {
      set({
        items: [],
        isRunning: false,
        currentPromptId: null
      });
    },

    reorderItems(fromIndex: number, toIndex: number) {
      update(state => {
        const items = [...state.items];
        const [movedItem] = items.splice(fromIndex, 1);
        items.splice(toIndex, 0, movedItem);
        return {
          ...state,
          items
        };
      });
    }
  };
}

export const promptQueueStore = createPromptQueueStore();

// Derived store for pending prompts count
export const pendingPromptsCount = derived(
  promptQueueStore,
  $store => $store.items.filter(item => item.status === 'pending').length
);

// Derived store for active prompt
export const activePrompt = derived(
  promptQueueStore,
  $store => $store.items.find(item => item.status === 'active') || null
);