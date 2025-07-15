<script lang="ts">
  import { onMount, onDestroy, createEventDispatcher } from 'svelte';
  import { browser } from '$app/environment';
  import type { editor } from 'monaco-editor';
  import { loadMonaco } from './monaco-loader';
  import TabBar from './TabBar.svelte';
  import type { EditorTab, EditorTheme } from './types';

  export let theme: EditorTheme = 'vs-dark';
  export let fontSize = 14;
  export let minimap = true;
  export let lineNumbers = true;
  export let wordWrap = false;
  export let autoSave = false;
  export let autoSaveDelay = 1000;

  let containerEl: HTMLDivElement;
  let editorInstance: editor.IStandaloneCodeEditor | null = null;
  let monaco: any;
  let tabs: EditorTab[] = [];
  let activeTabId: string | null = null;
  let autoSaveTimeout: NodeJS.Timeout | null = null;

  const dispatch = createEventDispatcher();

  // Create a new tab
  export function openFile(fileName: string, content: string, language?: string) {
    const existingTab = tabs.find(tab => tab.fileName === fileName);
    
    if (existingTab) {
      setActiveTab(existingTab.id);
      return;
    }

    const tab: EditorTab = {
      id: `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      fileName,
      content,
      language: language || detectLanguage(fileName),
      isDirty: false,
      viewState: null
    };

    tabs = [...tabs, tab];
    setActiveTab(tab.id);
  }

  // Close a tab
  export function closeTab(tabId: string) {
    const tabIndex = tabs.findIndex(tab => tab.id === tabId);
    if (tabIndex === -1) return;

    const tab = tabs[tabIndex];
    if (tab.isDirty) {
      const confirmed = confirm(`${tab.fileName} has unsaved changes. Close anyway?`);
      if (!confirmed) return;
    }

    tabs = tabs.filter(t => t.id !== tabId);

    if (activeTabId === tabId) {
      if (tabs.length > 0) {
        const newIndex = Math.min(tabIndex, tabs.length - 1);
        setActiveTab(tabs[newIndex].id);
      } else {
        activeTabId = null;
        if (editorInstance) {
          editorInstance.setValue('');
        }
      }
    }

    dispatch('tabClosed', { tabId, fileName: tab.fileName });
  }

  // Set active tab
  function setActiveTab(tabId: string) {
    const tab = tabs.find(t => t.id === tabId);
    if (!tab || !editorInstance) return;

    // Save current tab's view state
    const currentTab = tabs.find(t => t.id === activeTabId);
    if (currentTab) {
      currentTab.viewState = editorInstance.saveViewState();
      currentTab.content = editorInstance.getValue();
    }

    activeTabId = tabId;
    
    // Load new tab content
    const model = monaco.editor.createModel(tab.content, tab.language);
    editorInstance.setModel(model);
    
    if (tab.viewState) {
      editorInstance.restoreViewState(tab.viewState);
    }

    editorInstance.focus();
  }

  // Save current file
  export function saveCurrentFile() {
    const currentTab = tabs.find(t => t.id === activeTabId);
    if (!currentTab || !editorInstance) return;

    const content = editorInstance.getValue();
    currentTab.content = content;
    currentTab.isDirty = false;
    tabs = [...tabs];

    dispatch('save', {
      fileName: currentTab.fileName,
      content: content
    });
  }

  // Get current file content
  export function getCurrentContent(): string | null {
    return editorInstance ? editorInstance.getValue() : null;
  }

  // Find and replace
  export function openFindReplace() {
    if (editorInstance) {
      editorInstance.trigger('', 'actions.find');
    }
  }

  // Detect language from file extension
  function detectLanguage(fileName: string): string {
    const ext = fileName.split('.').pop()?.toLowerCase();
    const languageMap: Record<string, string> = {
      js: 'javascript',
      ts: 'typescript',
      jsx: 'javascript',
      tsx: 'typescript',
      json: 'json',
      html: 'html',
      htm: 'html',
      css: 'css',
      scss: 'scss',
      sass: 'sass',
      less: 'less',
      xml: 'xml',
      py: 'python',
      rb: 'ruby',
      php: 'php',
      java: 'java',
      c: 'c',
      cpp: 'cpp',
      cs: 'csharp',
      go: 'go',
      rs: 'rust',
      kt: 'kotlin',
      swift: 'swift',
      m: 'objective-c',
      scala: 'scala',
      sh: 'shell',
      bash: 'shell',
      zsh: 'shell',
      ps1: 'powershell',
      yaml: 'yaml',
      yml: 'yaml',
      toml: 'toml',
      ini: 'ini',
      md: 'markdown',
      tex: 'latex',
      r: 'r',
      sql: 'sql',
      lua: 'lua',
      vim: 'vim',
      diff: 'diff',
      svelte: 'html'
    };

    return languageMap[ext || ''] || 'plaintext';
  }

  // Handle content changes
  function handleContentChange() {
    const currentTab = tabs.find(t => t.id === activeTabId);
    if (!currentTab) return;

    const content = editorInstance?.getValue() || '';
    if (content !== currentTab.content) {
      currentTab.isDirty = true;
      tabs = [...tabs];

      dispatch('change', {
        fileName: currentTab.fileName,
        content: content
      });

      // Auto-save logic
      if (autoSave) {
        if (autoSaveTimeout) {
          clearTimeout(autoSaveTimeout);
        }
        autoSaveTimeout = setTimeout(() => {
          saveCurrentFile();
        }, autoSaveDelay);
      }
    }
  }

  // Initialize Monaco Editor
  async function initEditor() {
    if (!browser || !containerEl) return;

    try {
      monaco = await loadMonaco();
      
      // Configure Monaco
      monaco.editor.defineTheme('custom-dark', {
        base: 'vs-dark',
        inherit: true,
        rules: [],
        colors: {
          'editor.background': '#1e1e1e',
        }
      });

      // Create editor instance
      editorInstance = monaco.editor.create(containerEl, {
        value: '',
        language: 'plaintext',
        theme: theme,
        fontSize: fontSize,
        minimap: { enabled: minimap },
        lineNumbers: lineNumbers ? 'on' : 'off',
        wordWrap: wordWrap ? 'on' : 'off',
        automaticLayout: true,
        scrollBeyondLastLine: false,
        folding: true,
        glyphMargin: true,
        contextmenu: true,
        quickSuggestions: true,
        suggestOnTriggerCharacters: true,
        acceptSuggestionOnEnter: 'on',
        tabSize: 2,
        insertSpaces: true,
        formatOnPaste: true,
        formatOnType: true,
        scrollbar: {
          verticalScrollbarSize: 10,
          horizontalScrollbarSize: 10
        }
      });

      // Register keyboard shortcuts
      editorInstance.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
        saveCurrentFile();
      });

      editorInstance.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyF, () => {
        openFindReplace();
      });

      // Listen for content changes
      editorInstance.onDidChangeModelContent(handleContentChange);

      // Handle resize
      const resizeObserver = new ResizeObserver(() => {
        editorInstance?.layout();
      });
      resizeObserver.observe(containerEl);

      dispatch('ready', { editor: editorInstance, monaco });

    } catch (error) {
      console.error('Failed to initialize Monaco Editor:', error);
      dispatch('error', { error });
    }
  }

  // Update editor options when props change
  $: if (editorInstance) {
    editorInstance.updateOptions({
      theme,
      fontSize,
      minimap: { enabled: minimap },
      lineNumbers: lineNumbers ? 'on' : 'off',
      wordWrap: wordWrap ? 'on' : 'off'
    });
  }

  onMount(() => {
    initEditor();
  });

  onDestroy(() => {
    if (autoSaveTimeout) {
      clearTimeout(autoSaveTimeout);
    }
    if (editorInstance) {
      editorInstance.dispose();
    }
  });
</script>

<div class="code-editor">
  <TabBar
    {tabs}
    {activeTabId}
    on:tabClick={(e) => setActiveTab(e.detail.tabId)}
    on:tabClose={(e) => closeTab(e.detail.tabId)}
  />
  
  <div class="editor-container" bind:this={containerEl}></div>
</div>

<style>
  .code-editor {
    display: flex;
    flex-direction: column;
    height: 100%;
    width: 100%;
    background-color: #1e1e1e;
  }

  .editor-container {
    flex: 1;
    overflow: hidden;
  }

  :global(.monaco-editor) {
    position: absolute !important;
  }

  :global(.monaco-editor .margin) {
    background-color: #1e1e1e !important;
  }
</style>