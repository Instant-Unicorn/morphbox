<script lang="ts">
  import { commands } from '$lib/stores/commands';
  import { panels, panelStore } from '$lib/stores/panels';
  import { onMount } from 'svelte';

  let commandCount = 0;
  let panelCount = 0;

  onMount(() => {
    // Subscribe to commands to show count
    const unsubscribeCommands = commands.subscribe(state => {
      commandCount = state.commands.size;
    });

    // Subscribe to panels to show count
    const unsubscribePanels = panels.subscribe(currentPanels => {
      panelCount = currentPanels.length;
    });

    return () => {
      unsubscribeCommands();
      unsubscribePanels();
    };
  });

  function openCommandPalette() {
    commands.show();
  }

  function addSamplePanel() {
    panelStore.addPanel('terminal');
  }

  function clearAllPanels() {
    panelStore.clearPanels();
  }
</script>

<div class="demo-container">
  <header class="demo-header">
    <h1>Command Palette Demo</h1>
    <p>Test the command palette system with keyboard shortcuts and buttons.</p>
  </header>

  <main class="demo-content">
    <section class="stats-section">
      <h2>System Status</h2>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-number">{commandCount}</div>
          <div class="stat-label">Available Commands</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">{panelCount}</div>
          <div class="stat-label">Active Panels</div>
        </div>
      </div>
    </section>

    <section class="instructions-section">
      <h2>How to Use the Command Palette</h2>
      <div class="instruction-cards">
        <div class="instruction-card">
          <div class="instruction-icon">⌨️</div>
          <h3>Keyboard Shortcut</h3>
          <p>Press <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>P</kbd> (or <kbd>Cmd</kbd> + <kbd>Shift</kbd> + <kbd>P</kbd> on Mac) to open the command palette.</p>
        </div>
        
        <div class="instruction-card">
          <div class="instruction-icon">🔍</div>
          <h3>Search Commands</h3>
          <p>Type to search through available commands. The search supports fuzzy matching for quick access.</p>
        </div>
        
        <div class="instruction-card">
          <div class="instruction-icon">🧭</div>
          <h3>Navigate</h3>
          <p>Use <kbd>↑</kbd> and <kbd>↓</kbd> arrow keys to navigate through results, or hover with your mouse.</p>
        </div>
        
        <div class="instruction-card">
          <div class="instruction-icon">✅</div>
          <h3>Execute</h3>
          <p>Press <kbd>Enter</kbd> to execute the selected command, or click on any command to run it.</p>
        </div>
      </div>
    </section>

    <section class="actions-section">
      <h2>Quick Actions</h2>
      <div class="action-buttons">
        <button on:click={openCommandPalette} class="primary-button">
          🎯 Open Command Palette
        </button>
        <button on:click={addSamplePanel} class="secondary-button">
          ➕ Add Terminal Panel
        </button>
        <button on:click={clearAllPanels} class="secondary-button">
          🧹 Clear All Panels
        </button>
      </div>
    </section>

    <section class="commands-section">
      <h2>Available Commands</h2>
      <div class="commands-info">
        <p>The command palette includes the following types of commands:</p>
        <ul class="commands-list">
          <li><strong>Panel Management:</strong> Create, close, and manage panels (Terminal, File Explorer, Code Editor, Settings)</li>
          <li><strong>Layout Control:</strong> Switch between different layout modes (Floating, Grid, Split, Tabs)</li>
          <li><strong>Configuration:</strong> Save and load panel configurations</li>
          <li><strong>Help:</strong> Access help and keyboard shortcuts reference</li>
        </ul>
      </div>
    </section>
  </main>
</div>

<style>
  .demo-container {
    min-height: 100vh;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 2rem;
  }

  .demo-header {
    text-align: center;
    margin-bottom: 3rem;
  }

  .demo-header h1 {
    font-size: 3rem;
    font-weight: 700;
    margin-bottom: 1rem;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  }

  .demo-header p {
    font-size: 1.2rem;
    opacity: 0.9;
    max-width: 600px;
    margin: 0 auto;
  }

  .demo-content {
    max-width: 1200px;
    margin: 0 auto;
  }

  .stats-section {
    margin-bottom: 3rem;
  }

  .stats-section h2 {
    text-align: center;
    margin-bottom: 2rem;
    font-size: 2rem;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 2rem;
    max-width: 600px;
    margin: 0 auto;
  }

  .stat-card {
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(10px);
    border-radius: 16px;
    padding: 2rem;
    text-align: center;
    border: 1px solid rgba(255, 255, 255, 0.2);
  }

  .stat-number {
    font-size: 3rem;
    font-weight: 700;
    margin-bottom: 0.5rem;
  }

  .stat-label {
    opacity: 0.8;
    font-size: 0.9rem;
  }

  .instructions-section {
    margin-bottom: 3rem;
  }

  .instructions-section h2 {
    text-align: center;
    margin-bottom: 2rem;
    font-size: 2rem;
  }

  .instruction-cards {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 2rem;
  }

  .instruction-card {
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(10px);
    border-radius: 16px;
    padding: 2rem;
    border: 1px solid rgba(255, 255, 255, 0.2);
    text-align: center;
  }

  .instruction-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
  }

  .instruction-card h3 {
    margin-bottom: 1rem;
    font-size: 1.3rem;
  }

  .instruction-card p {
    opacity: 0.9;
    line-height: 1.6;
  }

  .actions-section {
    margin-bottom: 3rem;
  }

  .actions-section h2 {
    text-align: center;
    margin-bottom: 2rem;
    font-size: 2rem;
  }

  .action-buttons {
    display: flex;
    justify-content: center;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .primary-button, .secondary-button {
    padding: 1rem 2rem;
    border: none;
    border-radius: 12px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .primary-button {
    background: #ff6b6b;
    color: white;
    box-shadow: 0 4px 15px rgba(255, 107, 107, 0.4);
  }

  .primary-button:hover {
    background: #ff5252;
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(255, 107, 107, 0.6);
  }

  .secondary-button {
    background: rgba(255, 255, 255, 0.2);
    color: white;
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.3);
  }

  .secondary-button:hover {
    background: rgba(255, 255, 255, 0.3);
    transform: translateY(-2px);
  }

  .commands-section {
    margin-bottom: 3rem;
  }

  .commands-section h2 {
    text-align: center;
    margin-bottom: 2rem;
    font-size: 2rem;
  }

  .commands-info {
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(10px);
    border-radius: 16px;
    padding: 2rem;
    border: 1px solid rgba(255, 255, 255, 0.2);
    max-width: 800px;
    margin: 0 auto;
  }

  .commands-info p {
    margin-bottom: 1.5rem;
    opacity: 0.9;
    line-height: 1.6;
  }

  .commands-list {
    list-style: none;
    padding: 0;
  }

  .commands-list li {
    margin-bottom: 1rem;
    padding-left: 1.5rem;
    position: relative;
    opacity: 0.9;
    line-height: 1.6;
  }

  .commands-list li::before {
    content: '→';
    position: absolute;
    left: 0;
    font-weight: bold;
    color: #ff6b6b;
  }

  kbd {
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 4px;
    padding: 0.2rem 0.5rem;
    font-size: 0.8rem;
    font-family: monospace;
    margin: 0 0.2rem;
  }

  @media (max-width: 768px) {
    .demo-container {
      padding: 1rem;
    }

    .demo-header h1 {
      font-size: 2rem;
    }

    .instruction-cards {
      grid-template-columns: 1fr;
    }

    .action-buttons {
      flex-direction: column;
      align-items: center;
    }

    .primary-button, .secondary-button {
      width: 100%;
      max-width: 300px;
    }
  }
</style>