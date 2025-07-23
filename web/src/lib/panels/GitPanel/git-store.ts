import { writable, derived } from 'svelte/store';

export interface GitFile {
  path: string;
  status: 'modified' | 'added' | 'deleted' | 'renamed' | 'untracked';
  staged: boolean;
  oldPath?: string; // For renamed files
}

export interface GitCommit {
  hash: string;
  author: string;
  date: Date;
  message: string;
  shortHash: string;
}

export interface GitBranch {
  name: string;
  current: boolean;
  remote?: string;
  ahead?: number;
  behind?: number;
}

interface GitState {
  files: GitFile[];
  branches: GitBranch[];
  currentBranch: string;
  commits: GitCommit[];
  loading: boolean;
  lastRefresh: Date | null;
}

function createGitStore() {
  const { subscribe, set, update } = writable<GitState>({
    files: [],
    branches: [],
    currentBranch: '',
    commits: [],
    loading: false,
    lastRefresh: null
  });

  return {
    subscribe,
    
    setLoading(loading: boolean) {
      update(state => ({ ...state, loading }));
    },
    
    updateStatus(data: {
      files?: GitFile[];
      branches?: GitBranch[];
      currentBranch?: string;
    }) {
      update(state => ({
        ...state,
        ...data,
        lastRefresh: new Date()
      }));
    },
    
    updateCommits(commits: GitCommit[]) {
      update(state => ({
        ...state,
        commits
      }));
    },
    
    toggleStaged(filePath: string) {
      update(state => ({
        ...state,
        files: state.files.map(file =>
          file.path === filePath
            ? { ...file, staged: !file.staged }
            : file
        )
      }));
    },
    
    stageAll() {
      update(state => ({
        ...state,
        files: state.files.map(file => ({ ...file, staged: true }))
      }));
    },
    
    unstageAll() {
      update(state => ({
        ...state,
        files: state.files.map(file => ({ ...file, staged: false }))
      }));
    },
    
    clear() {
      set({
        files: [],
        branches: [],
        currentBranch: '',
        commits: [],
        loading: false,
        lastRefresh: null
      });
    }
  };
}

export const gitStore = createGitStore();

// Derived stores
export const stagedFiles = derived(
  gitStore,
  $store => $store.files.filter(f => f.staged)
);

export const unstagedFiles = derived(
  gitStore,
  $store => $store.files.filter(f => !f.staged)
);

export const hasChanges = derived(
  gitStore,
  $store => $store.files.length > 0
);