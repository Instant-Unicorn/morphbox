<script lang="ts">
  import { panels } from '$lib/stores/panels';
  import { panelRegistry, builtinPanels, customPanels } from '$lib/panels/registry';
  import CreatePanelWizard from './CreatePanelWizard.svelte';
  import { exportPanelCode, deleteGeneratedPanel } from '$lib/panels/generator';
  
  let showWizard = false;
  let showManager = false;
  
  // Open the panel creation wizard
  function openWizard() {
    showWizard = true;
  }
  
  // Close the wizard
  function closeWizard() {
    showWizard = false;
  }
  
  // Handle panel creation
  function handlePanelCreated(event: CustomEvent) {
    console.log('Panel created:', event.detail.panel);
    closeWizard();
  }
  
  // Open a panel
  function openPanel(panelId: string) {
    const definition = panelRegistry.get(panelId);
    if (definition) {
      panels.addPanel(definition.id, {
        title: definition.name,
        type: definition.id
      });
    }
  }
  
  // Export panel code
  function exportPanel(panelId: string) {
    exportPanelCode(panelId);
  }
  
  // Delete a custom panel
  async function deletePanel(panelId: string) {
    if (confirm('Are you sure you want to delete this panel?')) {
      await deleteGeneratedPanel(panelId);
    }
  }
  
  // Toggle manager visibility
  export function toggleManager() {
    showManager = !showManager;
  }
</script>

<!-- Panel Manager Button (can be placed in header) -->
<button class="manager-button" on:click={toggleManager} title="Panel Manager">
  <img src="/favicon.png" alt="MorphBox" width="40" height="40" />
</button>

<!-- Panel Manager Dropdown -->
{#if showManager}
  <div class="panel-manager" on:click|stopPropagation>
    <div class="manager-header">
      <h3>Panel Manager</h3>
      <button class="close-button" on:click={() => showManager = false}>×</button>
    </div>
    
    <div class="manager-content">
      <div class="section">
        <div class="section-header">
          <h4>Built-in Panels</h4>
        </div>
        <div class="panel-list">
          {#each $builtinPanels as panel}
            <div class="panel-item">
              <div class="panel-info">
                <strong>{panel.name}</strong>
                <small>{panel.description}</small>
              </div>
              <button class="open-button" on:click={() => openPanel(panel.id)}>
                Open
              </button>
            </div>
          {/each}
        </div>
      </div>
      
      <div class="section">
        <div class="section-header">
          <h4>Custom Panels</h4>
          <button class="create-button" on:click={openWizard}>
            + Create New
          </button>
        </div>
        <div class="panel-list">
          {#if $customPanels.length === 0}
            <p class="empty-message">No custom panels yet. Create your first panel!</p>
          {:else}
            {#each $customPanels as panel}
              <div class="panel-item">
                <div class="panel-info">
                  <strong>{panel.name}</strong>
                  <small>{panel.description}</small>
                  <div class="features">
                    {#each panel.features.slice(0, 3) as feature}
                      <span class="feature-tag">{feature}</span>
                    {/each}
                    {#if panel.features.length > 3}
                      <span class="feature-tag">+{panel.features.length - 3}</span>
                    {/if}
                  </div>
                </div>
                <div class="panel-actions">
                  <button class="action-button" on:click={() => openPanel(panel.id)} title="Open">
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M3 2v12h10V5.414L9.586 2H3zm8 .414L12.586 4H11V2.414zM4 3h6v2h3v8H4V3z"/>
                    </svg>
                  </button>
                  <button class="action-button" on:click={() => exportPanel(panel.id)} title="Export">
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M8 1.5v7.793l2.146-2.147.708.708L8 10.707 5.146 7.854l.708-.708L8 9.293V1.5h1zm-6 12h12v1H2v-1z"/>
                    </svg>
                  </button>
                  <button class="action-button danger" on:click={() => deletePanel(panel.id)} title="Delete">
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M6 2v1H2v1h12V3h-4V2a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1zM3 5v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V5H3zm2 1h1v6H5V6zm3 0h1v6H8V6zm3 0h1v6h-1V6z"/>
                    </svg>
                  </button>
                </div>
              </div>
            {/each}
          {/if}
        </div>
      </div>
    </div>
  </div>
{/if}

<!-- Panel Creation Wizard -->
{#if showWizard}
  <CreatePanelWizard 
    on:close={closeWizard}
    on:created={handlePanelCreated}
  />
{/if}

<style>
  .manager-button {
    background-color: transparent;
    border: none;
    color: #cccccc;
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    transition: background-color 0.2s;
  }
  
  .manager-button img {
    display: block;
  }
  
  .manager-button:hover {
    background-color: #3c3c3c;
  }
  
  .panel-manager {
    position: absolute;
    top: 40px;
    right: 16px;
    width: 400px;
    max-height: 600px;
    background-color: #1e1e1e;
    border: 1px solid #3e3e42;
    border-radius: 8px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
    z-index: 100;
    display: flex;
    flex-direction: column;
  }
  
  .manager-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    border-bottom: 1px solid #3e3e42;
  }
  
  .manager-header h3 {
    margin: 0;
    font-size: 16px;
    color: #cccccc;
  }
  
  .close-button {
    background: none;
    border: none;
    font-size: 20px;
    color: #858585;
    cursor: pointer;
    padding: 0;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    transition: background-color 0.2s;
  }
  
  .close-button:hover {
    background-color: #3c3c3c;
    color: #cccccc;
  }
  
  .manager-content {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
  }
  
  .section {
    margin-bottom: 24px;
  }
  
  .section:last-child {
    margin-bottom: 0;
  }
  
  .section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
  }
  
  .section-header h4 {
    margin: 0;
    font-size: 14px;
    color: #cccccc;
    font-weight: 600;
  }
  
  .create-button {
    padding: 4px 12px;
    background-color: #0e639c;
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 12px;
    cursor: pointer;
    transition: background-color 0.2s;
  }
  
  .create-button:hover {
    background-color: #1177bb;
  }
  
  .panel-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  
  .panel-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px;
    background-color: #252526;
    border: 1px solid #3e3e42;
    border-radius: 4px;
    transition: background-color 0.2s;
  }
  
  .panel-item:hover {
    background-color: #2d2d30;
  }
  
  .panel-info {
    flex: 1;
    min-width: 0;
  }
  
  .panel-info strong {
    display: block;
    font-size: 14px;
    color: #cccccc;
    margin-bottom: 2px;
  }
  
  .panel-info small {
    display: block;
    font-size: 12px;
    color: #858585;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  
  .features {
    display: flex;
    gap: 4px;
    margin-top: 4px;
    flex-wrap: wrap;
  }
  
  .feature-tag {
    font-size: 10px;
    padding: 2px 6px;
    background-color: #3c3c3c;
    color: #cccccc;
    border-radius: 3px;
  }
  
  .open-button {
    padding: 4px 12px;
    background-color: #3c3c3c;
    color: #cccccc;
    border: 1px solid #3e3e42;
    border-radius: 4px;
    font-size: 12px;
    cursor: pointer;
    transition: background-color 0.2s;
  }
  
  .open-button:hover {
    background-color: #484848;
  }
  
  .panel-actions {
    display: flex;
    gap: 4px;
  }
  
  .action-button {
    padding: 4px 6px;
    background-color: transparent;
    border: none;
    color: #858585;
    cursor: pointer;
    border-radius: 4px;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .action-button:hover {
    background-color: #3c3c3c;
    color: #cccccc;
  }
  
  .action-button.danger:hover {
    background-color: #5a1d1d;
    color: #f48771;
  }
  
  .empty-message {
    text-align: center;
    color: #858585;
    font-size: 13px;
    margin: 20px 0;
  }
  
  /* Mobile responsive */
  @media (max-width: 768px) {
    .panel-manager {
      width: calc(100vw - 32px);
      right: 16px;
      max-height: 70vh;
    }
  }
</style>