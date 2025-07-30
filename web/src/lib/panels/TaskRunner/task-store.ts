import { writable, derived } from 'svelte/store';

export interface Task {
  id: string;
  name: string;
  command: string;
  type: 'npm' | 'make' | 'custom';
  running: boolean;
  output: string[];
  exitCode: number | null;
  startTime: Date | null;
  endTime: Date | null;
  pid?: number;
}

export interface TaskPreset {
  id: string;
  name: string;
  command: string;
  type: 'npm' | 'make' | 'custom';
  description?: string;
}

interface TaskRunnerState {
  tasks: Task[];
  presets: TaskPreset[];
  activeTaskId: string | null;
}

function createTaskStore() {
  const { subscribe, set, update } = writable<TaskRunnerState>({
    tasks: [],
    presets: [],
    activeTaskId: null
  });

  // Load saved presets from localStorage
  if (typeof window !== 'undefined') {
    const savedPresets = localStorage.getItem('morphbox-task-presets');
    if (savedPresets) {
      try {
        const presets = JSON.parse(savedPresets);
        update(state => ({ ...state, presets }));
      } catch (e) {
        console.error('Failed to load task presets:', e);
      }
    }
  }

  return {
    subscribe,
    
    addTask(name: string, command: string, type: 'npm' | 'make' | 'custom' = 'custom'): string {
      const id = `task-${Date.now()}`;
      const task: Task = {
        id,
        name,
        command,
        type,
        running: false,
        output: [],
        exitCode: null,
        startTime: null,
        endTime: null
      };
      
      update(state => ({
        ...state,
        tasks: [...state.tasks, task]
      }));
      
      return id;
    },
    
    updateTask(id: string, updates: Partial<Task>) {
      update(state => ({
        ...state,
        tasks: state.tasks.map(task =>
          task.id === id ? { ...task, ...updates } : task
        )
      }));
    },
    
    removeTask(id: string) {
      update(state => ({
        ...state,
        tasks: state.tasks.filter(task => task.id !== id),
        activeTaskId: state.activeTaskId === id ? null : state.activeTaskId
      }));
    },
    
    setActiveTask(id: string | null) {
      update(state => ({ ...state, activeTaskId: id }));
    },
    
    appendOutput(id: string, output: string) {
      update(state => ({
        ...state,
        tasks: state.tasks.map(task =>
          task.id === id 
            ? { ...task, output: [...task.output, output] }
            : task
        )
      }));
    },
    
    clearOutput(id: string) {
      update(state => ({
        ...state,
        tasks: state.tasks.map(task =>
          task.id === id 
            ? { ...task, output: [] }
            : task
        )
      }));
    },
    
    startTask(id: string, pid?: number) {
      update(state => ({
        ...state,
        tasks: state.tasks.map(task =>
          task.id === id 
            ? { 
                ...task, 
                running: true, 
                startTime: new Date(),
                endTime: null,
                exitCode: null,
                pid
              }
            : task
        )
      }));
    },
    
    stopTask(id: string, exitCode: number) {
      update(state => ({
        ...state,
        tasks: state.tasks.map(task =>
          task.id === id 
            ? { 
                ...task, 
                running: false, 
                endTime: new Date(),
                exitCode,
                pid: undefined
              }
            : task
        )
      }));
    },
    
    addPreset(preset: Omit<TaskPreset, 'id'>) {
      const id = `preset-${Date.now()}`;
      const newPreset = { ...preset, id };
      
      update(state => {
        const presets = [...state.presets, newPreset];
        // Save to localStorage
        if (typeof window !== 'undefined') {
          localStorage.setItem('morphbox-task-presets', JSON.stringify(presets));
        }
        return { ...state, presets };
      });
    },
    
    removePreset(id: string) {
      update(state => {
        const presets = state.presets.filter(p => p.id !== id);
        // Save to localStorage
        if (typeof window !== 'undefined') {
          localStorage.setItem('morphbox-task-presets', JSON.stringify(presets));
        }
        return { ...state, presets };
      });
    },
    
    loadNpmScripts(scripts: Record<string, string>) {
      const npmPresets: TaskPreset[] = Object.entries(scripts).map(([name, command]) => ({
        id: `npm-${name}`,
        name: `npm run ${name}`,
        command: `npm run ${name}`,
        type: 'npm' as const,
        description: command
      }));
      
      update(state => ({
        ...state,
        presets: [
          ...state.presets.filter(p => p.type !== 'npm'),
          ...npmPresets
        ]
      }));
    },
    
    clear() {
      set({
        tasks: [],
        presets: [],
        activeTaskId: null
      });
    }
  };
}

export const taskStore = createTaskStore();

// Derived stores
export const activeTask = derived(
  taskStore,
  $store => $store.tasks.find(t => t.id === $store.activeTaskId) || null
);

export const runningTasks = derived(
  taskStore,
  $store => $store.tasks.filter(t => t.running)
);

export const npmScripts = derived(
  taskStore,
  $store => $store.presets.filter(p => p.type === 'npm')
);

export const customPresets = derived(
  taskStore,
  $store => $store.presets.filter(p => p.type === 'custom')
);