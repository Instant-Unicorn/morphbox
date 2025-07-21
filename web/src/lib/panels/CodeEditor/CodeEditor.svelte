<script lang="ts">
  import { onMount, onDestroy, createEventDispatcher } from 'svelte';
  import { browser } from '$app/environment';
  import type { editor } from 'monaco-editor';
  import { loadMonaco } from './monaco-loader';
  import TabBar from './TabBar.svelte';
  import type { EditorTab, EditorTheme } from './types';
  import { settings as settingsStore } from '$lib/panels/Settings/settings-store';
  import { get } from 'svelte/store';

  export let theme: EditorTheme = 'vs-dark';
  export let fontSize = 14;
  export let minimap = true;
  export let lineNumbers = true;
  export let wordWrap = false;
  export let autoSave = false;
  export let autoSaveDelay = 1000;
  export let filePath: string | null = null;

  let containerEl: HTMLDivElement;
  let editorInstance: editor.IStandaloneCodeEditor | null = null;
  let monaco: any;
  let tabs: EditorTab[] = [];
  let activeTabId: string | null = null;
  let autoSaveTimeout: NodeJS.Timeout | null = null;
  let showMenu = false;

  const dispatch = createEventDispatcher();
  
  $: activeTab = tabs.find(tab => tab.id === activeTabId);

  // Create a new tab
  export function openFile(fileName: string, content: string, language?: string, filePath?: string) {
    const existingTab = tabs.find(tab => tab.fileName === fileName);
    
    if (existingTab) {
      setActiveTab(existingTab.id);
      return;
    }

    const tab: EditorTab = {
      id: `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      fileName,
      filePath,
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
      editorInstance.trigger('', 'actions.find', null);
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

  // Menu handlers
  function handleNewFile() {
    showMenu = false;
    const fileName = prompt('Enter file name:');
    if (fileName) {
      openFile(fileName, '', detectLanguage(fileName));
    }
  }

  async function handleOpenFile() {
    showMenu = false;
    // Create a file input to select files
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '*/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const content = await file.text();
        openFile(file.name, content, detectLanguage(file.name));
      }
    };
    input.click();
  }

  async function handleSave() {
    showMenu = false;
    if (activeTab && editorInstance) {
      const content = editorInstance.getValue();
      const filePath = activeTab.filePath || `/${activeTab.fileName}`;
      
      try {
        const response = await fetch('/api/files/write', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            path: filePath,
            content
          })
        });

        if (!response.ok) {
          throw new Error('Failed to save file');
        }

        // Mark tab as not dirty
        tabs = tabs.map(tab => 
          tab.id === activeTab.id ? { ...tab, isDirty: false, content } : tab
        );
        
        dispatch('save', { fileName: activeTab.fileName, content });
      } catch (error) {
        console.error('Error saving file:', error);
        alert(`Failed to save ${activeTab.fileName}`);
      }
    }
  }

  async function handleSaveAs() {
    showMenu = false;
    if (activeTab && editorInstance) {
      const newFileName = prompt('Save as:', activeTab.fileName);
      if (newFileName) {
        const content = editorInstance.getValue();
        const newPath = `/${newFileName}`;
        
        try {
          const response = await fetch('/api/files/write', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              path: newPath,
              content
            })
          });

          if (!response.ok) {
            throw new Error('Failed to save file');
          }

          // Update tab with new filename
          tabs = tabs.map(tab => 
            tab.id === activeTab.id ? { 
              ...tab, 
              fileName: newFileName, 
              filePath: newPath,
              isDirty: false,
              content 
            } : tab
          );
          
          dispatch('save', { fileName: newFileName, content });
        } catch (error) {
          console.error('Error saving file:', error);
          alert(`Failed to save ${newFileName}`);
        }
      }
    }
  }

  async function handleSaveAll() {
    showMenu = false;
    for (const tab of tabs) {
      if (tab.isDirty && editorInstance) {
        const filePath = tab.filePath || `/${tab.fileName}`;
        
        try {
          const response = await fetch('/api/files/write', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              path: filePath,
              content: tab.content
            })
          });

          if (!response.ok) {
            throw new Error(`Failed to save ${tab.fileName}`);
          }
        } catch (error) {
          console.error('Error saving file:', error);
          alert(`Failed to save ${tab.fileName}`);
        }
      }
    }
    
    // Mark all tabs as not dirty
    tabs = tabs.map(tab => ({ ...tab, isDirty: false }));
  }

  function handleCloseTab() {
    showMenu = false;
    if (activeTabId) {
      closeTab(activeTabId);
    }
  }

  function handleCloseAll() {
    showMenu = false;
    tabs = [];
    activeTabId = null;
    if (editorInstance) {
      editorInstance.setValue('');
    }
  }

  function handleFind() {
    showMenu = false;
    if (editorInstance) {
      editorInstance.trigger('keyboard', 'actions.find', {});
    }
  }

  function handleReplace() {
    showMenu = false;
    if (editorInstance) {
      editorInstance.trigger('keyboard', 'editor.action.startFindReplaceAction', {});
    }
  }

  async function handleFormat() {
    showMenu = false;
    if (editorInstance) {
      await editorInstance.getAction('editor.action.formatDocument')?.run();
    }
  }

  // Click outside directive
  function clickOutside(node: HTMLElement) {
    const handleClick = (event: MouseEvent) => {
      if (node && !node.contains(event.target as Node) && !event.defaultPrevented) {
        node.dispatchEvent(new CustomEvent('clickoutside'));
      }
    };

    document.addEventListener('click', handleClick, true);

    return {
      destroy() {
        document.removeEventListener('click', handleClick, true);
      }
    };
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
      console.log('Initializing Monaco Editor...');
      monaco = await loadMonaco();
      
      if (!monaco) {
        throw new Error('Monaco failed to load');
      }
      
      console.log('Monaco loaded successfully');
      console.log('Is mobile:', isMobile);
      console.log('Container dimensions:', containerEl.getBoundingClientRect());
      
      // Configure Monaco
      monaco.editor.defineTheme('custom-dark', {
        base: 'vs-dark',
        inherit: true,
        rules: [],
        colors: {
          'editor.background': '#1e1e1e',
        }
      });

      // Get editor settings
      const currentSettings = get(settingsStore);
      const editorSettings = currentSettings.editor || {};
      
      // Detect if we're on a mobile device
      isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;
      
      // Create editor instance with mobile-friendly options
      editorInstance = monaco.editor.create(containerEl, {
        value: '',
        language: 'plaintext',
        theme: editorSettings.theme || theme,
        fontSize: isMobile ? 12 : (editorSettings.fontSize || fontSize),
        fontFamily: editorSettings.fontFamily || undefined,
        lineHeight: editorSettings.lineHeight || undefined,
        minimap: { enabled: isMobile ? false : minimap },
        lineNumbers: lineNumbers ? 'on' : 'off',
        wordWrap: isMobile ? 'on' : (editorSettings.wordWrap ? 'on' : 'off'),
        automaticLayout: true,
        scrollBeyondLastLine: false,
        folding: !isMobile,
        glyphMargin: !isMobile,
        contextmenu: true,
        quickSuggestions: !isMobile,
        suggestOnTriggerCharacters: !isMobile,
        acceptSuggestionOnEnter: 'on',
        tabSize: editorSettings.tabSize || 2,
        insertSpaces: true,
        formatOnPaste: !isMobile,
        formatOnType: !isMobile,
        scrollbar: {
          verticalScrollbarSize: isMobile ? 14 : 10,
          horizontalScrollbarSize: isMobile ? 14 : 10,
          useShadows: false,
          verticalHasArrows: false,
          horizontalHasArrows: false
        },
        // Mobile-specific options
        dragAndDrop: !isMobile,
        accessibilitySupport: isMobile ? 'off' : 'auto',
        renderWhitespace: 'none',
        renderControlCharacters: false,
        snippetSuggestions: isMobile ? 'none' : 'inline',
        suggestSelection: 'first',
        suggestFontSize: isMobile ? 12 : 0,
        // Touch support
        mouseWheelZoom: false,
        multiCursorModifier: 'alt',
        fixedOverflowWidgets: true
      });

      // Register keyboard shortcuts
      if (editorInstance) {
        editorInstance.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
          saveCurrentFile();
        });

        editorInstance.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyF, () => {
          openFindReplace();
        });

        // Listen for content changes
        editorInstance.onDidChangeModelContent(handleContentChange);
      }

      // Handle resize with debouncing for mobile performance
      let resizeTimeout: number;
      const handleResize = () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
          if (editorInstance && containerEl) {
            const rect = containerEl.getBoundingClientRect();
            console.log('Editor container dimensions:', rect.width, 'x', rect.height);
            
            // Force layout with specific dimensions on mobile
            if (rect.width > 0 && rect.height > 0) {
              editorInstance.layout({ width: rect.width, height: rect.height });
              
              // Double-check on mobile that the editor is visible
              const editorDom = editorInstance.getDomNode();
              if (editorDom && isMobile) {
                editorDom.style.width = `${rect.width}px`;
                editorDom.style.height = `${rect.height}px`;
              }
            } else {
              // Fallback: force recalculation
              requestAnimationFrame(() => {
                const newRect = containerEl.getBoundingClientRect();
                if (newRect.width > 0 && newRect.height > 0) {
                  editorInstance.layout({ width: newRect.width, height: newRect.height });
                }
              });
            }
          }
        }, 100);
      };
      
      const resizeObserver = new ResizeObserver(handleResize);
      resizeObserver.observe(containerEl);
      
      // Also listen to window resize for mobile orientation changes
      window.addEventListener('resize', handleResize);
      window.addEventListener('orientationchange', handleResize);
      
      // Initial layout after a short delay to ensure container is sized
      setTimeout(handleResize, 200);

      dispatch('ready', { editor: editorInstance, monaco });
      
      // Force initial layout on mobile after DOM settles
      if (isMobile) {
        setTimeout(() => {
          const rect = containerEl.getBoundingClientRect();
          console.log('Mobile initial layout:', rect);
          if (rect.width > 0 && rect.height > 0) {
            editorInstance.layout({ width: rect.width, height: rect.height });
          }
        }, 300);
      }

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

  let settingsUnsubscribe: (() => void) | null = null;
  let isMobile = false;
  
  onMount(async () => {
    // Small delay to ensure container is properly sized on mobile
    await new Promise(resolve => setTimeout(resolve, 50));
    await initEditor();
    
    // Subscribe to settings changes
    settingsUnsubscribe = settingsStore.subscribe($settings => {
      if (editorInstance && $settings.editor && monaco) {
        // Update editor options when settings change
        editorInstance.updateOptions({
          fontSize: $settings.editor.fontSize,
          fontFamily: $settings.editor.fontFamily,
          lineHeight: $settings.editor.lineHeight,
          wordWrap: $settings.editor.wordWrap ? 'on' : 'off',
          tabSize: $settings.editor.tabSize,
          theme: $settings.editor.theme
        });
        
        // Update theme if changed
        if ($settings.editor.theme) {
          monaco.editor.setTheme($settings.editor.theme);
        }
      }
    });
    
    // Load initial file if provided
    if (filePath) {
      try {
        const response = await fetch(`/api/files/read?path=${encodeURIComponent(filePath)}`);
        if (response.ok) {
          const data = await response.json();
          const fileName = filePath.split('/').pop() || 'Untitled';
          openFile(fileName, data.content, detectLanguage(fileName), filePath);
        } else {
          console.error('Failed to load file:', filePath);
        }
      } catch (error) {
        console.error('Error loading file:', error);
      }
    }
  });

  onDestroy(() => {
    if (autoSaveTimeout) {
      clearTimeout(autoSaveTimeout);
    }
    if (editorInstance) {
      editorInstance.dispose();
    }
    if (settingsUnsubscribe) {
      settingsUnsubscribe();
    }
  });
</script>

<div class="code-editor">
  <div class="editor-header">
    <TabBar
      {tabs}
      {activeTabId}
      on:tabClick={(e) => setActiveTab(e.detail.tabId)}
      on:tabClose={(e) => closeTab(e.detail.tabId)}
    />
    <div class="editor-menu">
      <button class="menu-button" on:click={() => showMenu = !showMenu}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <circle cx="8" cy="2" r="1.5"/>
          <circle cx="8" cy="8" r="1.5"/>
          <circle cx="8" cy="14" r="1.5"/>
        </svg>
      </button>
      {#if showMenu}
        <div class="menu-dropdown" use:clickOutside on:clickoutside={() => showMenu = false}>
          <button class="menu-item" on:click={handleNewFile}>
            <span class="menu-icon">📄</span>
            <span>New File</span>
            <span class="menu-shortcut">Ctrl+N</span>
          </button>
          <button class="menu-item" on:click={handleOpenFile}>
            <span class="menu-icon">📂</span>
            <span>Open File</span>
            <span class="menu-shortcut">Ctrl+O</span>
          </button>
          <div class="menu-divider"></div>
          <button class="menu-item" on:click={handleSave} disabled={!activeTab || !activeTab.isDirty}>
            <span class="menu-icon">💾</span>
            <span>Save</span>
            <span class="menu-shortcut">Ctrl+S</span>
          </button>
          <button class="menu-item" on:click={handleSaveAs} disabled={!activeTab}>
            <span class="menu-icon">💾</span>
            <span>Save As...</span>
            <span class="menu-shortcut">Ctrl+Shift+S</span>
          </button>
          <button class="menu-item" on:click={handleSaveAll}>
            <span class="menu-icon">💾</span>
            <span>Save All</span>
          </button>
          <div class="menu-divider"></div>
          <button class="menu-item" on:click={handleCloseTab} disabled={!activeTab}>
            <span class="menu-icon">❌</span>
            <span>Close</span>
            <span class="menu-shortcut">Ctrl+W</span>
          </button>
          <button class="menu-item" on:click={handleCloseAll}>
            <span class="menu-icon">❌</span>
            <span>Close All</span>
          </button>
          <div class="menu-divider"></div>
          <button class="menu-item" on:click={handleFind} disabled={!activeTab}>
            <span class="menu-icon">🔍</span>
            <span>Find</span>
            <span class="menu-shortcut">Ctrl+F</span>
          </button>
          <button class="menu-item" on:click={handleReplace} disabled={!activeTab}>
            <span class="menu-icon">🔄</span>
            <span>Replace</span>
            <span class="menu-shortcut">Ctrl+H</span>
          </button>
          <div class="menu-divider"></div>
          <button class="menu-item" on:click={handleFormat} disabled={!activeTab}>
            <span class="menu-icon">✨</span>
            <span>Format Document</span>
            <span class="menu-shortcut">Shift+Alt+F</span>
          </button>
        </div>
      {/if}
    </div>
  </div>
  
  <div class="editor-container" bind:this={containerEl}>
    {#if !editorInstance && browser}
      <div class="editor-loading">
        <p>Loading editor...</p>
      </div>
    {/if}
  </div>
  
  <!-- Mobile debug info -->
  {#if browser && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)}
    <div class="mobile-debug" style="position: absolute; bottom: 0; right: 0; background: rgba(0,0,0,0.8); color: white; padding: 4px; font-size: 10px; z-index: 9999;">
      Mobile: {window.innerWidth}x{window.innerHeight}
    </div>
  {/if}
</div>

<style>
  .code-editor {
    display: flex;
    flex-direction: column;
    height: 100%;
    width: 100%;
    background-color: var(--editor-bg, #1e1e1e);
    min-height: 0; /* Fix flexbox height issues */
    position: relative;
    overflow: hidden; /* Ensure proper containment */
  }

  .editor-container {
    flex: 1 1 auto;
    overflow: hidden;
    position: relative;
    width: 100%;
    /* Ensure minimum height on mobile */
    min-height: 200px;
    container-type: size; /* Enable container queries */
  }
  
  /* Mobile-specific adjustments */
  @media (max-width: 768px) {
    .editor-container {
      min-height: 300px;
      height: calc(100vh - 120px); /* Account for header and other UI elements */
    }
    
    .code-editor {
      height: 100vh;
      max-height: 100vh;
    }
  }

  :global(.monaco-editor) {
    position: absolute !important;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    width: 100% !important;
    height: 100% !important;
  }
  
  /* Ensure Monaco's internal containers are sized properly */
  :global(.monaco-editor .overflow-guard) {
    width: 100% !important;
    height: 100% !important;
  }
  
  :global(.monaco-editor .monaco-scrollable-element) {
    width: 100% !important;
    height: 100% !important;
  }

  :global(.monaco-editor .margin) {
    background-color: var(--editor-bg, #1e1e1e) !important;
  }

  .editor-loading {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: var(--text-color, #cccccc);
    font-size: 14px;
  }

  .editor-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background-color: var(--surface, #252526);
    border-bottom: 1px solid var(--border-color, #3e3e42);
  }

  .editor-menu {
    position: relative;
    margin-right: 8px;
  }

  .menu-button {
    background: none;
    border: none;
    color: var(--text-color, #cccccc);
    padding: 6px 10px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    transition: background-color 0.2s;
  }

  .menu-button:hover {
    background-color: var(--hover-bg, #3e3e42);
  }

  .menu-dropdown {
    position: absolute;
    top: 100%;
    right: 0;
    margin-top: 4px;
    background-color: var(--surface, #252526);
    border: 1px solid var(--border-color, #3e3e42);
    border-radius: 4px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
    min-width: 250px;
    z-index: 1000;
    max-height: 80vh;
    overflow-y: auto;
  }
  
  /* Mobile menu adjustments */
  @media (max-width: 768px) {
    .menu-dropdown {
      position: fixed;
      top: auto;
      bottom: 0;
      left: 0;
      right: 0;
      margin: 0;
      border-radius: 16px 16px 0 0;
      min-width: 100%;
      max-height: 70vh;
    }
    
    .menu-item {
      padding: 12px 16px;
      font-size: 14px;
    }
    
    .menu-shortcut {
      display: none;
    }
  }

  .menu-item {
    display: flex;
    align-items: center;
    width: 100%;
    padding: 8px 12px;
    background: none;
    border: none;
    color: var(--text-color, #cccccc);
    text-align: left;
    cursor: pointer;
    font-size: 13px;
    transition: background-color 0.2s;
  }

  .menu-item:hover:not(:disabled) {
    background-color: var(--accent-color, #094771);
  }

  .menu-item:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .menu-icon {
    margin-right: 8px;
    width: 16px;
    display: inline-block;
  }

  .menu-shortcut {
    margin-left: auto;
    opacity: 0.6;
    font-size: 11px;
  }

  .menu-divider {
    height: 1px;
    background-color: var(--border-color, #3e3e42);
    margin: 4px 0;
  }
</style>