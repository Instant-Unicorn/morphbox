<script lang="ts">
  import PanelMenu from '$lib/components/PanelMenu.svelte';
  import type { PanelConfig } from '$lib/panels/types';

  // Example available panels
  const availablePanels: PanelConfig[] = [
    {
      id: 'terminal-1',
      title: 'Terminal',
      icon: '💻',
      component: null as any, // Would be actual component
    },
    {
      id: 'editor-1',
      title: 'Code Editor',
      icon: '✏️',
      component: null as any,
    },
    {
      id: 'files-1',
      title: 'File Explorer',
      icon: '📁',
      component: null as any,
    },
    {
      id: 'console-1',
      title: 'Console',
      icon: '🖥️',
      component: null as any,
    },
    {
      id: 'browser-1',
      title: 'Browser',
      icon: '🌐',
      component: null as any,
    }
  ];

  // Currently active panels
  let activePanels: string[] = ['terminal-1', 'editor-1'];

  // Event handlers
  function handleCreatePanel(event: CustomEvent) {
    console.log('Create panel:', event.detail);
    // Implement panel creation logic
  }

  function handleAddPanel(event: CustomEvent) {
    console.log('Add panel:', event.detail);
    const { id } = event.detail;
    if (!activePanels.includes(id)) {
      activePanels = [...activePanels, id];
    }
  }

  function handleRemovePanel(event: CustomEvent) {
    console.log('Remove panel:', event.detail);
    const { id } = event.detail;
    activePanels = activePanels.filter(p => p !== id);
  }

  function handleConfigurePanel(event: CustomEvent) {
    console.log('Configure panel:', event.detail);
    // Implement panel configuration logic
  }
</script>

<div class="demo-container">
  <header class="demo-header">
    <h1>PanelMenu Component Demo</h1>
    <div class="panel-menu-wrapper">
      <PanelMenu
        {availablePanels}
        {activePanels}
        on:createPanel={handleCreatePanel}
        on:addPanel={handleAddPanel}
        on:removePanel={handleRemovePanel}
        on:configurePanel={handleConfigurePanel}
      />
    </div>
  </header>

  <main class="demo-content">
    <section>
      <h2>Active Panels</h2>
      <div class="panel-status">
        {#if activePanels.length > 0}
          <ul>
            {#each activePanels as panelId}
              {@const panel = availablePanels.find(p => p.id === panelId)}
              {#if panel}
                <li>{panel.icon} {panel.title} (ID: {panelId})</li>
              {/if}
            {/each}
          </ul>
        {:else}
          <p>No active panels</p>
        {/if}
      </div>
    </section>

    <section>
      <h2>Instructions</h2>
      <ul class="instructions">
        <li>Click the + button to open the panel menu</li>
        <li>Use "Create Panel" to design a new custom panel</li>
        <li>Use "Add Panel" to add existing panels from the gallery</li>
        <li>Use "Remove Panel" to remove active panels</li>
        <li>Use "Manage Panels" to view and organize all panels</li>
      </ul>
    </section>
  </main>
</div>

<style>
  .demo-container {
    height: 100vh;
    background-color: #1e1e1e;
    color: #d4d4d4;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  .demo-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 24px;
    background-color: #2d2d30;
    border-bottom: 1px solid #3e3e42;
  }

  .demo-header h1 {
    margin: 0;
    font-size: 20px;
    color: #cccccc;
  }

  .panel-menu-wrapper {
    /* The PanelMenu component will be positioned here */
  }

  .demo-content {
    padding: 24px;
    max-width: 800px;
    margin: 0 auto;
  }

  section {
    margin-bottom: 32px;
  }

  h2 {
    margin: 0 0 16px;
    font-size: 18px;
    color: #cccccc;
  }

  .panel-status {
    background-color: #252526;
    border: 1px solid #3e3e42;
    border-radius: 4px;
    padding: 16px;
  }

  .panel-status ul {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .panel-status li {
    padding: 4px 0;
    color: #d4d4d4;
  }

  .panel-status p {
    margin: 0;
    color: #858585;
  }

  .instructions {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .instructions li {
    padding: 8px 0;
    color: #d4d4d4;
    position: relative;
    padding-left: 20px;
  }

  .instructions li:before {
    content: "•";
    position: absolute;
    left: 0;
    color: #007acc;
  }
</style>