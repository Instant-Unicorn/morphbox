<script lang="ts">
  import { onMount } from 'svelte';
  import { createEventDispatcher } from 'svelte';
  import { settings as settingsStore, applyTheme } from './settings-store';
  
  const dispatch = createEventDispatcher();
  
  // Define settings interface
  interface Settings {
    theme: 'dark' | 'light' | 'custom';
    customTheme?: {
      background: string;
      foreground: string;
      accent: string;
      surface: string;
      border: string;
    };
    editor: {
      fontSize: number;
      fontFamily: string;
      lineHeight: number;
      wordWrap: boolean;
      tabSize: number;
      theme: string;
    };
    fileExplorer: {
      showHiddenFiles: boolean;
      defaultTarget: 'new' | 'last-used';
      sortBy: 'name' | 'date' | 'size';
      sortOrder: 'asc' | 'desc';
    };
    panels: {
      defaultPanelColors: {
        headerColor: string;
        backgroundColor: string;
        borderColor: string;
      };
      autoCreateRows: boolean;
      rowHeight: number;
      panelSpacing: number;
      showPanelBorders: boolean;
    };
    layout: {
      defaultLayout: 'row' | 'grid';
      persistLayout: boolean;
      animateTransitions: boolean;
    };
    shortcuts: {
      [action: string]: string;
    };
    security: {
      autoLockMinutes: number;
      requireAuthExternal: boolean;
      showSecurityWarnings: boolean;
    };
  }
  
  // Default settings
  const defaultSettings: Settings = {
    theme: 'dark',
    customTheme: {
      background: '#1e1e1e',
      foreground: '#d4d4d4',
      accent: '#007acc',
      surface: '#252526',
      border: '#3e3e42'
    },
    editor: {
      fontSize: 14,
      fontFamily: '"Cascadia Code", "Fira Code", monospace',
      lineHeight: 1.5,
      wordWrap: true,
      tabSize: 2,
      theme: 'vs-dark'
    },
    fileExplorer: {
      showHiddenFiles: false,
      defaultTarget: 'new',
      sortBy: 'name',
      sortOrder: 'asc'
    },
    panels: {
      defaultPanelColors: {
        headerColor: '#252526',
        backgroundColor: '#1e1e1e',
        borderColor: '#3e3e42'
      },
      autoCreateRows: true,
      rowHeight: 400,
      panelSpacing: 4,
      showPanelBorders: true
    },
    layout: {
      defaultLayout: 'row',
      persistLayout: true,
      animateTransitions: true
    },
    shortcuts: {
      'new-panel': 'Ctrl+N',
      'close-panel': 'Ctrl+W',
      'toggle-settings': 'Ctrl+,',
      'save-file': 'Ctrl+S',
      'open-file': 'Ctrl+O',
      'find': 'Ctrl+F',
      'replace': 'Ctrl+H'
    },
    security: {
      autoLockMinutes: 30,
      requireAuthExternal: true,
      showSecurityWarnings: true
    }
  };
  
  // Current settings
  let settings: Settings = { ...defaultSettings };
  let activeTab: 'appearance' | 'editor' | 'explorer' | 'panels' | 'layout' | 'shortcuts' | 'security' = 'appearance';
  let importInput: HTMLInputElement;
  
  // Load settings from localStorage
  onMount(() => {
    const savedSettings = localStorage.getItem('morphbox-settings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        settings = deepMerge(defaultSettings, parsed);
      } catch (e) {
        console.error('Failed to load settings:', e);
      }
    }
    applySettings();
  });
  
  // Save settings to localStorage
  function saveSettings() {
    localStorage.setItem('morphbox-settings', JSON.stringify(settings));
    settingsStore.set(settings);
    applySettings();
    dispatch('settingsChanged', settings);
    dispatch('notification', { message: 'Settings saved successfully', type: 'success' });
  }
  
  // Export settings
  function exportSettings() {
    const dataStr = JSON.stringify(settings, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `morphbox-settings-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  }
  
  // Import settings
  function importSettings() {
    importInput.click();
  }
  
  function handleFileImport(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedSettings = JSON.parse(e.target?.result as string);
        settings = { ...defaultSettings, ...importedSettings };
        saveSettings();
        dispatch('notification', { message: 'Settings imported successfully', type: 'success' });
      } catch (error) {
        console.error('Failed to import settings:', error);
        dispatch('notification', { message: 'Failed to import settings', type: 'error' });
      }
    };
    reader.readAsText(file);
  }
  
  // Reset settings to defaults
  function resetSettings() {
    if (confirm('Are you sure you want to reset all settings to defaults?')) {
      settings = { ...defaultSettings };
      saveSettings();
    }
  }
  
  // Font families available
  const fontFamilies = [
    '"Cascadia Code", "Fira Code", monospace',
    '"JetBrains Mono", monospace',
    '"Source Code Pro", monospace',
    '"Ubuntu Mono", monospace',
    '"Consolas", monospace',
    '"Monaco", monospace',
    '"Menlo", monospace',
    'monospace'
  ];
  
  // Editor themes
  const editorThemes = [
    'vs-dark',
    'vs-light',
    'hc-black',
    'hc-light'
  ];
  
  // Deep merge helper
  function deepMerge(target: any, source: any): any {
    const result = { ...target };
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = deepMerge(target[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    return result;
  }
  
  // Apply settings to document
  function applySettings() {
    if (typeof window === 'undefined') return;
    
    const root = document.documentElement;
    
    // Apply theme
    switch (settings.theme) {
      case 'light':
        root.style.setProperty('--bg-color', '#f3f3f3');
        root.style.setProperty('--text-color', '#1e1e1e');
        root.style.setProperty('--border-color', '#e0e0e0');
        root.style.setProperty('--input-bg', '#ffffff');
        root.style.setProperty('--accent-color', '#0066cc');
        root.style.setProperty('--text-secondary', '#6e6e6e');
        break;
      case 'custom':
        if (settings.customTheme) {
          root.style.setProperty('--bg-color', settings.customTheme.background);
          root.style.setProperty('--text-color', settings.customTheme.foreground);
          root.style.setProperty('--accent-color', settings.customTheme.accent);
          root.style.setProperty('--surface', settings.customTheme.surface);
          root.style.setProperty('--border-color', settings.customTheme.border);
        }
        break;
      default: // dark
        root.style.setProperty('--bg-color', '#2d2d30');
        root.style.setProperty('--text-color', '#cccccc');
        root.style.setProperty('--border-color', '#3e3e42');
        root.style.setProperty('--input-bg', '#3c3c3c');
        root.style.setProperty('--accent-color', '#007acc');
        root.style.setProperty('--text-secondary', '#858585');
    }
    
    // Dispatch event for other components to react
    window.dispatchEvent(new CustomEvent('morphbox-settings-changed', { detail: settings }));
  }
  
  // Handle shortcut input
  function handleShortcutInput(event: KeyboardEvent, action: string) {
    event.preventDefault();
    
    const keys = [];
    if (event.ctrlKey) keys.push('Ctrl');
    if (event.shiftKey) keys.push('Shift');
    if (event.altKey) keys.push('Alt');
    if (event.metaKey) keys.push('Cmd');
    
    // Add the actual key
    if (event.key && event.key !== 'Control' && event.key !== 'Shift' && event.key !== 'Alt' && event.key !== 'Meta') {
      keys.push(event.key.length === 1 ? event.key.toUpperCase() : event.key);
    }
    
    if (keys.length > 1 || (keys.length === 1 && !['Control', 'Shift', 'Alt', 'Meta'].includes(keys[0]))) {
      settings.shortcuts[action] = keys.join('+');
    }
  }
</script>

<div class="settings-panel">
  <header class="settings-header">
    <h2>Settings</h2>
    <button class="close-button" on:click={() => dispatch('close')}>×</button>
  </header>
  
  <nav class="settings-tabs">
    <button 
      class="tab" 
      class:active={activeTab === 'appearance'}
      on:click={() => activeTab = 'appearance'}
    >
      Appearance
    </button>
    <button 
      class="tab" 
      class:active={activeTab === 'editor'}
      on:click={() => activeTab = 'editor'}
    >
      Editor
    </button>
    <button 
      class="tab" 
      class:active={activeTab === 'explorer'}
      on:click={() => activeTab = 'explorer'}
    >
      Explorer
    </button>
    <button 
      class="tab" 
      class:active={activeTab === 'panels'}
      on:click={() => activeTab = 'panels'}
    >
      Panels
    </button>
    <button 
      class="tab" 
      class:active={activeTab === 'layout'}
      on:click={() => activeTab = 'layout'}
    >
      Layout
    </button>
    <button 
      class="tab" 
      class:active={activeTab === 'shortcuts'}
      on:click={() => activeTab = 'shortcuts'}
    >
      Shortcuts
    </button>
    <button 
      class="tab" 
      class:active={activeTab === 'security'}
      on:click={() => activeTab = 'security'}
    >
      Security
    </button>
  </nav>
  
  <div class="settings-content">
    {#if activeTab === 'appearance'}
      <section class="settings-section">
        <h3>Theme</h3>
        <div class="setting-group">
          <label>
            <input type="radio" bind:group={settings.theme} value="dark" on:change={applySettings} />
            Dark Theme
          </label>
          <label>
            <input type="radio" bind:group={settings.theme} value="light" on:change={applySettings} />
            Light Theme
          </label>
          <label>
            <input type="radio" bind:group={settings.theme} value="custom" on:change={applySettings} />
            Custom Theme
          </label>
        </div>
        
        {#if settings.theme === 'custom' && settings.customTheme}
          <div class="custom-theme-settings">
            <h4>Custom Theme Colors</h4>
            <div class="color-setting">
              <label for="bg-color">Background Color</label>
              <input 
                type="color" 
                id="bg-color"
                bind:value={settings.customTheme.background} 
                on:change={applySettings}
              />
            </div>
            <div class="color-setting">
              <label for="fg-color">Foreground Color</label>
              <input 
                type="color" 
                id="fg-color"
                bind:value={settings.customTheme.foreground} 
                on:change={applySettings}
              />
            </div>
            <div class="color-setting">
              <label for="accent-color">Accent Color</label>
              <input 
                type="color" 
                id="accent-color"
                bind:value={settings.customTheme.accent} 
                on:change={applySettings}
              />
            </div>
            <div class="color-setting">
              <label for="surface-color">Surface Color</label>
              <input 
                type="color" 
                id="surface-color"
                bind:value={settings.customTheme.surface} 
                on:change={applySettings}
              />
            </div>
            <div class="color-setting">
              <label for="border-color">Border Color</label>
              <input 
                type="color" 
                id="border-color"
                bind:value={settings.customTheme.border} 
                on:change={applySettings}
              />
            </div>
          </div>
        {/if}
      </section>
    {/if}
    
    {#if activeTab === 'editor'}
      <section class="settings-section">
        <h3>Code Editor Settings</h3>
        
        <div class="setting-row">
          <label for="editor-font-size">Font Size</label>
          <div class="input-group">
            <input 
              type="range" 
              id="editor-font-size"
              min="10" 
              max="24" 
              bind:value={settings.editor.fontSize}
            />
            <span class="value">{settings.editor.fontSize}px</span>
          </div>
        </div>
        
        <div class="setting-row">
          <label for="editor-font-family">Font Family</label>
          <select id="editor-font-family" bind:value={settings.editor.fontFamily}>
            {#each fontFamilies as font}
              <option value={font}>{font.replace(/"/g, '')}</option>
            {/each}
          </select>
        </div>
        
        <div class="setting-row">
          <label for="editor-line-height">Line Height</label>
          <div class="input-group">
            <input 
              type="range" 
              id="editor-line-height"
              min="1" 
              max="2" 
              step="0.1"
              bind:value={settings.editor.lineHeight}
            />
            <span class="value">{settings.editor.lineHeight}</span>
          </div>
        </div>
        
        <div class="setting-row">
          <label for="tab-size">Tab Size</label>
          <div class="input-group">
            <input 
              type="range" 
              id="tab-size"
              min="2" 
              max="8" 
              step="1"
              bind:value={settings.editor.tabSize}
            />
            <span class="value">{settings.editor.tabSize} spaces</span>
          </div>
        </div>
        
        <div class="setting-row">
          <label for="editor-theme">Editor Theme</label>
          <select id="editor-theme" bind:value={settings.editor.theme}>
            {#each editorThemes as theme}
              <option value={theme}>{theme}</option>
            {/each}
          </select>
        </div>
        
        <div class="setting-row">
          <label>
            <input 
              type="checkbox" 
              bind:checked={settings.editor.wordWrap}
            />
            Word Wrap
          </label>
        </div>
      </section>
    {/if}
    
    {#if activeTab === 'explorer'}
      <section class="settings-section">
        <h3>File Explorer Settings</h3>
        
        <div class="setting-row">
          <label>
            <input 
              type="checkbox" 
              bind:checked={settings.fileExplorer.showHiddenFiles}
            />
            Show Hidden Files
          </label>
        </div>
        
        <div class="setting-row">
          <label for="default-target">Default Open Target</label>
          <select id="default-target" bind:value={settings.fileExplorer.defaultTarget}>
            <option value="new">New Panel</option>
            <option value="last-used">Last Used Panel</option>
          </select>
        </div>
        
        <div class="setting-row">
          <label for="sort-by">Sort Files By</label>
          <select id="sort-by" bind:value={settings.fileExplorer.sortBy}>
            <option value="name">Name</option>
            <option value="date">Date Modified</option>
            <option value="size">Size</option>
          </select>
        </div>
        
        <div class="setting-row">
          <label for="sort-order">Sort Order</label>
          <select id="sort-order" bind:value={settings.fileExplorer.sortOrder}>
            <option value="asc">Ascending</option>
            <option value="desc">Descending</option>
          </select>
        </div>
      </section>
    {/if}
    
    {#if activeTab === 'panels'}
      <section class="settings-section">
        <h3>Panel Settings</h3>
        
        <h4>Default Panel Colors</h4>
        <div class="panel-colors">
          <div class="color-setting">
            <label for="panel-header-color">Header Color</label>
            <input 
              type="color" 
              id="panel-header-color"
              bind:value={settings.panels.defaultPanelColors.headerColor} 
            />
          </div>
          <div class="color-setting">
            <label for="panel-bg-color">Background Color</label>
            <input 
              type="color" 
              id="panel-bg-color"
              bind:value={settings.panels.defaultPanelColors.backgroundColor} 
            />
          </div>
          <div class="color-setting">
            <label for="panel-border-color">Border Color</label>
            <input 
              type="color" 
              id="panel-border-color"
              bind:value={settings.panels.defaultPanelColors.borderColor} 
            />
          </div>
        </div>
        
        <div class="setting-row">
          <label>
            <input 
              type="checkbox" 
              bind:checked={settings.panels.autoCreateRows}
            />
            Auto-create New Rows
          </label>
        </div>
        
        <div class="setting-row">
          <label for="row-height">Default Row Height</label>
          <div class="input-group">
            <input 
              type="range" 
              id="row-height"
              min="200" 
              max="800" 
              step="50"
              bind:value={settings.panels.rowHeight}
            />
            <span class="value">{settings.panels.rowHeight}px</span>
          </div>
        </div>
        
        <div class="setting-row">
          <label for="panel-spacing">Panel Spacing</label>
          <div class="input-group">
            <input 
              type="range" 
              id="panel-spacing"
              min="0" 
              max="20" 
              step="1"
              bind:value={settings.panels.panelSpacing}
            />
            <span class="value">{settings.panels.panelSpacing}px</span>
          </div>
        </div>
        
        <div class="setting-row">
          <label>
            <input 
              type="checkbox" 
              bind:checked={settings.panels.showPanelBorders}
            />
            Show Panel Borders
          </label>
        </div>
      </section>
    {/if}
    
    {#if activeTab === 'layout'}
      <section class="settings-section">
        <h3>Layout Settings</h3>
        
        <div class="setting-row">
          <label for="default-layout">Default Layout Mode</label>
          <select id="default-layout" bind:value={settings.layout.defaultLayout}>
            <option value="row">Row Layout</option>
            <option value="grid">Grid Layout</option>
          </select>
        </div>
        
        <div class="setting-row">
          <label>
            <input 
              type="checkbox" 
              bind:checked={settings.layout.persistLayout}
            />
            Remember Layout Between Sessions
          </label>
        </div>
        
        <div class="setting-row">
          <label>
            <input 
              type="checkbox" 
              bind:checked={settings.layout.animateTransitions}
            />
            Animate Layout Transitions
          </label>
        </div>
      </section>
    {/if}
    
    {#if activeTab === 'shortcuts'}
      <section class="settings-section">
        <h3>Keyboard Shortcuts</h3>
        <p class="hint">Click on a shortcut field and press the key combination you want to assign.</p>
        
        <div class="shortcuts-list">
          {#each Object.entries(settings.shortcuts) as [action, shortcut]}
            <div class="shortcut-row">
              <label for="shortcut-{action}">{action.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</label>
              <input 
                id="shortcut-{action}"
                type="text" 
                value={shortcut}
                readonly
                on:keydown={(e) => handleShortcutInput(e, action)}
                placeholder="Press keys..."
              />
            </div>
          {/each}
        </div>
      </section>
    {/if}
    
    {#if activeTab === 'security'}
      <section class="settings-section">
        <h3>Security Settings</h3>
        
        <div class="setting-row">
          <label for="auto-lock">Auto-lock After</label>
          <div class="input-group">
            <input 
              type="range" 
              id="auto-lock"
              min="5" 
              max="120" 
              step="5"
              bind:value={settings.security.autoLockMinutes}
            />
            <span class="value">{settings.security.autoLockMinutes} minutes</span>
          </div>
        </div>
        
        <div class="setting-row">
          <label>
            <input 
              type="checkbox" 
              bind:checked={settings.security.requireAuthExternal}
            />
            Require Authentication for External Access
          </label>
        </div>
        
        <div class="setting-row">
          <label>
            <input 
              type="checkbox" 
              bind:checked={settings.security.showSecurityWarnings}
            />
            Show Security Warnings
          </label>
        </div>
        
        <div class="warning-box">
          <p><strong>⚠️ Security Notice:</strong></p>
          <p>External mode exposes Morphbox to your network. Always use strong authentication credentials and keep them secure.</p>
        </div>
      </section>
    {/if}
  </div>
  
  <footer class="settings-footer">
    <div class="footer-left">
      <button class="btn btn-secondary" on:click={resetSettings}>Reset to Defaults</button>
    </div>
    <div class="footer-right">
      <button class="btn btn-secondary" on:click={importSettings}>Import</button>
      <button class="btn btn-secondary" on:click={exportSettings}>Export</button>
      <button class="btn btn-primary" on:click={saveSettings}>Save Settings</button>
    </div>
  </footer>
  
  <input 
    type="file" 
    accept=".json"
    bind:this={importInput}
    on:change={handleFileImport}
    style="display: none;"
  />
</div>

<style>
  .settings-panel {
    display: flex;
    flex-direction: column;
    background-color: var(--bg-color, #2d2d30);
    color: var(--text-color, #cccccc);
    border: 1px solid var(--border-color, #3e3e42);
    border-radius: 6px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    height: 100%;
    overflow: hidden;
  }
  
  .settings-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    border-bottom: 1px solid var(--border-color, #3e3e42);
  }
  
  .settings-header h2 {
    margin: 0;
    font-size: 18px;
    font-weight: 500;
  }
  
  .close-button {
    background: none;
    border: none;
    color: var(--text-color, #cccccc);
    font-size: 24px;
    cursor: pointer;
    padding: 0;
    width: 30px;
    height: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    transition: background-color 0.2s;
  }
  
  .close-button:hover {
    background-color: rgba(255, 255, 255, 0.1);
  }
  
  .settings-tabs {
    display: flex;
    border-bottom: 1px solid var(--border-color, #3e3e42);
    background-color: rgba(0, 0, 0, 0.1);
  }
  
  .tab {
    flex: 1;
    padding: 10px 16px;
    background: none;
    border: none;
    color: var(--text-color, #cccccc);
    cursor: pointer;
    font-size: 14px;
    transition: background-color 0.2s;
    border-bottom: 2px solid transparent;
  }
  
  .tab:hover {
    background-color: rgba(255, 255, 255, 0.05);
  }
  
  .tab.active {
    border-bottom-color: var(--accent-color, #007acc);
    background-color: rgba(255, 255, 255, 0.05);
  }
  
  .settings-content {
    flex: 1;
    overflow-y: auto;
    padding: 20px;
  }
  
  .settings-section {
    margin-bottom: 24px;
  }
  
  .settings-section h3 {
    margin: 0 0 16px 0;
    font-size: 16px;
    font-weight: 500;
  }
  
  .settings-section h4 {
    margin: 16px 0 8px 0;
    font-size: 14px;
    font-weight: 500;
  }
  
  .setting-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  
  .setting-group label {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
  }
  
  .setting-row {
    margin-bottom: 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  
  .setting-row label {
    font-size: 14px;
  }
  
  .input-group {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  
  .input-group input[type="range"] {
    width: 150px;
  }
  
  .value {
    min-width: 50px;
    text-align: right;
    font-size: 13px;
    color: var(--text-secondary, #858585);
  }
  
  input[type="text"],
  input[type="number"],
  select {
    background-color: var(--input-bg, #3c3c3c);
    color: var(--text-color, #cccccc);
    border: 1px solid var(--border-color, #3e3e42);
    padding: 6px 10px;
    border-radius: 4px;
    font-size: 13px;
  }
  
  input[type="text"]:focus,
  input[type="number"]:focus,
  select:focus {
    outline: none;
    border-color: var(--accent-color, #007acc);
  }
  
  input[type="color"] {
    width: 50px;
    height: 30px;
    border: 1px solid var(--border-color, #3e3e42);
    border-radius: 4px;
    cursor: pointer;
  }
  
  input[type="checkbox"],
  input[type="radio"] {
    cursor: pointer;
  }
  
  .custom-theme-settings {
    margin-top: 16px;
    padding: 16px;
    background-color: rgba(0, 0, 0, 0.2);
    border-radius: 4px;
  }
  
  .color-setting {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
  }
  
  .color-setting label {
    font-size: 14px;
  }
  
  .panel-position {
    margin-bottom: 16px;
    padding: 12px;
    background-color: rgba(0, 0, 0, 0.1);
    border-radius: 4px;
  }
  
  .panel-position h5 {
    margin: 0 0 8px 0;
    font-size: 14px;
    font-weight: 500;
  }
  
  .position-inputs {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
  }
  
  .position-inputs label {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
  }
  
  .position-inputs input {
    width: 100%;
  }
  
  .shortcuts-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  
  .shortcut-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  
  .shortcut-row label {
    font-size: 14px;
  }
  
  .shortcut-row input {
    width: 150px;
    text-align: center;
    cursor: pointer;
  }
  
  .shortcut-row input:focus {
    background-color: var(--accent-color, #007acc);
    color: white;
  }
  
  .hint {
    font-size: 12px;
    color: var(--text-secondary, #858585);
    margin-bottom: 16px;
  }
  
  .settings-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px;
    border-top: 1px solid var(--border-color, #3e3e42);
  }
  
  .footer-left,
  .footer-right {
    display: flex;
    gap: 8px;
  }
  
  .btn {
    padding: 6px 16px;
    border-radius: 4px;
    font-size: 13px;
    cursor: pointer;
    transition: background-color 0.2s;
    border: 1px solid var(--border-color, #3e3e42);
  }
  
  .btn-primary {
    background-color: var(--accent-color, #007acc);
    color: white;
    border-color: var(--accent-color, #007acc);
  }
  
  .btn-primary:hover {
    background-color: #005a9e;
  }
  
  .btn-secondary {
    background-color: var(--input-bg, #3c3c3c);
    color: var(--text-color, #cccccc);
  }
  
  .btn-secondary:hover {
    background-color: #484848;
  }
  
  /* Scrollbar styling */
  .settings-content::-webkit-scrollbar {
    width: 10px;
  }
  
  .settings-content::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.1);
  }
  
  .settings-content::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.2);
    border-radius: 5px;
  }
  
  .settings-content::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.3);
  }
  
  /* New styles for added sections */
  .panel-colors {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 12px;
    margin-bottom: 20px;
  }
  
  .warning-box {
    background-color: rgba(255, 193, 7, 0.1);
    border: 1px solid rgba(255, 193, 7, 0.3);
    border-radius: 4px;
    padding: 12px;
    margin-top: 20px;
  }
  
  .warning-box p {
    margin: 0 0 8px 0;
    font-size: 13px;
  }
  
  .warning-box p:last-child {
    margin-bottom: 0;
  }
</style>