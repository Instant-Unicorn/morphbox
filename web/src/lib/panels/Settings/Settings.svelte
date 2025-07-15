<script lang="ts">
  import { onMount } from 'svelte';
  import { createEventDispatcher } from 'svelte';
  
  const dispatch = createEventDispatcher();
  
  // Define settings interface
  interface Settings {
    theme: 'dark' | 'light' | 'custom';
    customTheme?: {
      background: string;
      foreground: string;
      accent: string;
    };
    terminal: {
      fontSize: number;
      fontFamily: string;
      lineHeight: number;
      cursorStyle: 'block' | 'underline' | 'bar';
      cursorBlink: boolean;
    };
    panels: {
      defaultPositions: {
        terminal: { x: number; y: number; width: string; height: string };
        settings: { x: number; y: number; width: string; height: string };
        [key: string]: { x: number; y: number; width: string; height: string };
      };
      snapToGrid: boolean;
      gridSize: number;
    };
    shortcuts: {
      [action: string]: string;
    };
  }
  
  // Default settings
  const defaultSettings: Settings = {
    theme: 'dark',
    customTheme: {
      background: '#1e1e1e',
      foreground: '#d4d4d4',
      accent: '#007acc'
    },
    terminal: {
      fontSize: 14,
      fontFamily: '"Cascadia Code", "Fira Code", monospace',
      lineHeight: 1.2,
      cursorStyle: 'block',
      cursorBlink: true
    },
    panels: {
      defaultPositions: {
        terminal: { x: 0, y: 40, width: '100%', height: 'calc(100% - 62px)' },
        settings: { x: 50, y: 50, width: '600px', height: '500px' }
      },
      snapToGrid: true,
      gridSize: 10
    },
    shortcuts: {
      'toggle-terminal': 'Ctrl+`',
      'toggle-settings': 'Ctrl+,',
      'clear-terminal': 'Ctrl+L',
      'new-terminal': 'Ctrl+Shift+`',
      'close-panel': 'Escape',
      'save-settings': 'Ctrl+S'
    }
  };
  
  // Current settings
  let settings: Settings = { ...defaultSettings };
  let activeTab: 'appearance' | 'terminal' | 'panels' | 'shortcuts' = 'appearance';
  let importInput: HTMLInputElement;
  
  // Load settings from localStorage
  onMount(() => {
    const savedSettings = localStorage.getItem('morphbox-settings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        settings = { 
          ...defaultSettings, 
          ...parsed,
          customTheme: { ...defaultSettings.customTheme, ...parsed.customTheme }
        };
      } catch (e) {
        console.error('Failed to load settings:', e);
      }
    }
  });
  
  // Save settings to localStorage
  function saveSettings() {
    localStorage.setItem('morphbox-settings', JSON.stringify(settings));
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
      class:active={activeTab === 'terminal'}
      on:click={() => activeTab = 'terminal'}
    >
      Terminal
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
      class:active={activeTab === 'shortcuts'}
      on:click={() => activeTab = 'shortcuts'}
    >
      Shortcuts
    </button>
  </nav>
  
  <div class="settings-content">
    {#if activeTab === 'appearance'}
      <section class="settings-section">
        <h3>Theme</h3>
        <div class="setting-group">
          <label>
            <input type="radio" bind:group={settings.theme} value="dark" />
            Dark Theme
          </label>
          <label>
            <input type="radio" bind:group={settings.theme} value="light" />
            Light Theme
          </label>
          <label>
            <input type="radio" bind:group={settings.theme} value="custom" />
            Custom Theme
          </label>
        </div>
        
        {#if settings.theme === 'custom'}
          <div class="custom-theme-settings">
            <h4>Custom Theme Colors</h4>
            <div class="color-setting">
              <label for="bg-color">Background Color</label>
              <input 
                type="color" 
                id="bg-color"
                bind:value={settings.customTheme.background} 
              />
            </div>
            <div class="color-setting">
              <label for="fg-color">Foreground Color</label>
              <input 
                type="color" 
                id="fg-color"
                bind:value={settings.customTheme.foreground} 
              />
            </div>
            <div class="color-setting">
              <label for="accent-color">Accent Color</label>
              <input 
                type="color" 
                id="accent-color"
                bind:value={settings.customTheme.accent} 
              />
            </div>
          </div>
        {/if}
      </section>
    {/if}
    
    {#if activeTab === 'terminal'}
      <section class="settings-section">
        <h3>Terminal Settings</h3>
        
        <div class="setting-row">
          <label for="font-size">Font Size</label>
          <div class="input-group">
            <input 
              type="range" 
              id="font-size"
              min="10" 
              max="24" 
              bind:value={settings.terminal.fontSize}
            />
            <span class="value">{settings.terminal.fontSize}px</span>
          </div>
        </div>
        
        <div class="setting-row">
          <label for="font-family">Font Family</label>
          <select id="font-family" bind:value={settings.terminal.fontFamily}>
            {#each fontFamilies as font}
              <option value={font}>{font.replace(/"/g, '')}</option>
            {/each}
          </select>
        </div>
        
        <div class="setting-row">
          <label for="line-height">Line Height</label>
          <div class="input-group">
            <input 
              type="range" 
              id="line-height"
              min="1" 
              max="2" 
              step="0.1"
              bind:value={settings.terminal.lineHeight}
            />
            <span class="value">{settings.terminal.lineHeight}</span>
          </div>
        </div>
        
        <div class="setting-row">
          <label for="cursor-style">Cursor Style</label>
          <select id="cursor-style" bind:value={settings.terminal.cursorStyle}>
            <option value="block">Block</option>
            <option value="underline">Underline</option>
            <option value="bar">Bar</option>
          </select>
        </div>
        
        <div class="setting-row">
          <label>
            <input 
              type="checkbox" 
              bind:checked={settings.terminal.cursorBlink}
            />
            Cursor Blink
          </label>
        </div>
      </section>
    {/if}
    
    {#if activeTab === 'panels'}
      <section class="settings-section">
        <h3>Panel Settings</h3>
        
        <div class="setting-row">
          <label>
            <input 
              type="checkbox" 
              bind:checked={settings.panels.snapToGrid}
            />
            Snap to Grid
          </label>
        </div>
        
        {#if settings.panels.snapToGrid}
          <div class="setting-row">
            <label for="grid-size">Grid Size</label>
            <div class="input-group">
              <input 
                type="range" 
                id="grid-size"
                min="5" 
                max="50" 
                step="5"
                bind:value={settings.panels.gridSize}
              />
              <span class="value">{settings.panels.gridSize}px</span>
            </div>
          </div>
        {/if}
        
        <h4>Default Panel Positions</h4>
        <p class="hint">Configure default positions for panels when they are opened.</p>
        
        {#each Object.entries(settings.panels.defaultPositions) as [panel, position]}
          <div class="panel-position">
            <h5>{panel.charAt(0).toUpperCase() + panel.slice(1)}</h5>
            <div class="position-inputs">
              <label>
                X: <input type="number" bind:value={position.x} />
              </label>
              <label>
                Y: <input type="number" bind:value={position.y} />
              </label>
              <label>
                Width: <input type="text" bind:value={position.width} />
              </label>
              <label>
                Height: <input type="text" bind:value={position.height} />
              </label>
            </div>
          </div>
        {/each}
      </section>
    {/if}
    
    {#if activeTab === 'shortcuts'}
      <section class="settings-section">
        <h3>Keyboard Shortcuts</h3>
        <p class="hint">Click on a shortcut field and press the key combination you want to assign.</p>
        
        <div class="shortcuts-list">
          {#each Object.entries(settings.shortcuts) as [action, shortcut]}
            <div class="shortcut-row">
              <label>{action.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</label>
              <input 
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
</style>