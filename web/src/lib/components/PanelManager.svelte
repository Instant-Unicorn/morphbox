<script lang="ts">
  import { panels, panelStore } from '$lib/stores/panels';
  import { panelRegistry, builtinPanels, customPanels } from '$lib/panels/registry';
  import CreatePanelWizard from './CreatePanelWizard.svelte';
  import { exportPanelCode, deleteGeneratedPanel } from '$lib/panels/generator';
  import { createEventDispatcher, onMount } from 'svelte';
  
  export let showReset = false;
  
  const dispatch = createEventDispatcher();
  
  let showWizard = false;
  let showManager = false;
  let isSmallViewport = false;
  
  // Check viewport size
  function checkViewportSize() {
    isSmallViewport = window.innerWidth < 768;
  }
  
  // Debug: log panels on mount and setup viewport check
  onMount(() => {
    console.log('[PanelManager] Built-in panels:', $builtinPanels);
    console.log('[PanelManager] Custom panels:', $customPanels);
    
    // Check initial viewport size
    checkViewportSize();
    
    // Listen for resize events
    const handleResize = () => checkViewportSize();
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  });
  
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
      // Check if panel already exists (except for terminal and claude which can have multiple)
      const existingPanel = $panels.find(p => p.type === definition.id);
      if (existingPanel && definition.id !== 'terminal' && definition.id !== 'claude') {
        // Focus existing panel instead of creating new one
        // For grid layout, we can't really "focus" but we could highlight it
        return;
      }
      
      // Dispatch event to add panel through GridLayout
      dispatch('action', {
        action: 'add',
        panelType: definition.id,
        panelData: {
          title: definition.name
        }
      });
      
      // Close the manager dropdown
      showManager = false;
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
    console.log('[PanelManager] Toggle clicked, current state:', showManager);
    showManager = !showManager;
    console.log('[PanelManager] New state:', showManager);
  }
  
  // Handle click outside to close (removed - using backdrop instead)
  
  // Reset panels
  function resetPanels() {
    if (confirm('Reset all panels to default layout?')) {
      dispatch('action', { action: 'reset' });
      showManager = false;
    }
  }
</script>

<div class="panel-manager-wrapper">
  <!-- Panel Manager Button (can be placed in header) -->
  <button class="manager-button" on:click|stopPropagation={toggleManager} title="Panel Manager">
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M2 2h5v5H2V2zm7 0h5v5H9V2zM2 9h5v5H2V9zm7 0h5v5H9V9z"/>
    </svg>
  </button>

  <!-- Panel Manager Dropdown -->
  {#if showManager}
    <!-- Backdrop -->
    <div class="panel-manager-backdrop" on:click={() => showManager = false}></div>
    
    <div class="panel-manager" role="dialog" aria-label="Panel Manager" on:click|stopPropagation>
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
          <div class="header-buttons">
            <button class="create-button" on:click={openWizard}>
              + Create New
            </button>
            {#if showReset}
              <button class="reset-button" on:click={resetPanels}>
                Reset Panels
              </button>
            {/if}
          </div>
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
    
    <div class="manager-footer">
      <span>MorphBox by <a href="https://iu.dev" target="_blank" rel="noopener noreferrer">IU.dev</a></span>
    </div>
  </div>
  {/if}
</div>

<!-- Panel Creation Wizard -->
{#if showWizard}
  <CreatePanelWizard 
    on:close={closeWizard}
    on:created={handlePanelCreated}
  />
{/if}

<style>
  .panel-manager-wrapper {
    position: relative;
    display: inline-block;
    z-index: 1000; /* Ensure wrapper doesn't block dropdown */
  }
  
  .panel-manager-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    z-index: 9999;
  }
  
  .manager-button {
    background-color: transparent;
    border: none;
    color: var(--text-primary, #cccccc);
    cursor: pointer;
    padding: var(--spacing-xs) var(--spacing-sm);
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background-color 0.2s;
  }
  
  .manager-button:hover {
    background-color: #3c3c3c;
  }
  
  .panel-manager {
    position: fixed;
    top: 50px;
    right: var(--spacing-lg);
    width: min(400px, calc(100vw - var(--spacing-lg) * 2));
    max-height: calc(100vh - 100px);
    background-color: var(--bg-primary, #1e1e1e);
    border: 1px solid var(--border-color, #3e3e42);
    border-radius: 8px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
    z-index: 10000;
    display: flex;
    flex-direction: column;
    overflow: hidden;
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
    overflow-x: hidden;
    padding: var(--spacing-md);
    min-height: 0; /* Important for flex children */
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
  
  .header-buttons {
    display: flex;
    gap: 8px;
  }
  
  .reset-button {
    padding: 4px 12px;
    background-color: #d73a49;
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 12px;
    cursor: pointer;
    transition: background-color 0.2s;
  }
  
  .reset-button:hover {
    background-color: #cb2431;
  }
  
  .panel-list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
  }
  
  .panel-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--spacing-md);
    background-color: var(--bg-secondary, #252526);
    border: 1px solid var(--border-color, #3e3e42);
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
  
  .manager-footer {
    padding: 12px 16px;
    border-top: 1px solid #3e3e42;
    text-align: center;
    font-size: 12px;
    color: #858585;
    flex-shrink: 0; /* Don't shrink footer */
  }
  
  .manager-footer a {
    color: #007acc;
    text-decoration: none;
    transition: color 0.2s;
  }
  
  .manager-footer a:hover {
    color: #0098ff;
    text-decoration: underline;
  }
  
  /* Mobile responsive - Bottom sheet pattern */
  @media (max-width: 768px) {
    .panel-manager-backdrop {
      /* Darken backdrop on mobile for better focus */
      background-color: rgba(0, 0, 0, 0.7);
    }
    
    .panel-manager {
      /* Bottom sheet pattern */
      position: fixed;
      top: auto;
      bottom: 0;
      left: 0;
      right: 0;
      width: 100%;
      max-height: 85vh;
      border-radius: 16px 16px 0 0;
      /* Add safe area padding */
      padding-bottom: env(safe-area-inset-bottom);
      /* Smooth animation */
      animation: slideUp 0.3s ease-out;
    }
    
    /* Drag handle indicator */
    .panel-manager::before {
      content: '';
      position: absolute;
      top: 8px;
      left: 50%;
      transform: translateX(-50%);
      width: 36px;
      height: 4px;
      background-color: var(--border-color);
      border-radius: 2px;
      z-index: 1;
      pointer-events: none; /* Don't block clicks */
    }
    
    .manager-header {
      /* Add padding for drag handle */
      margin-top: 12px;
    }
    
    .manager-content {
      /* Better scrolling on mobile */
      -webkit-overflow-scrolling: touch;
      /* Add bottom padding for safe area */
      padding-bottom: calc(var(--spacing-lg) + env(safe-area-inset-bottom));
    }
    
    /* Stack panel items on mobile */
    .panel-list {
      grid-template-columns: 1fr;
    }
    
    .panel-item {
      /* Larger touch targets */
      min-height: 64px;
      padding: var(--spacing-md);
    }
    
    /* Simplify panel info on mobile */
    .features {
      display: none;
    }
    
    /* Full-width buttons on very small screens */
    @media (max-width: 400px) {
      .panel-item {
        flex-direction: column;
        gap: var(--spacing-sm);
      }
      
      .panel-info {
        text-align: center;
      }
      
      .open-button {
        width: 100%;
      }
      
      .panel-actions {
        width: 100%;
        justify-content: center;
      }
    }
  }
  
  /* Slide up animation for mobile */
  @keyframes slideUp {
    from {
      transform: translateY(100%);
    }
    to {
      transform: translateY(0);
    }
  }
  
  /* Touch-friendly adjustments */
  @media (pointer: coarse) {
    .manager-button,
    .close-button,
    .create-button,
    .reset-button,
    .open-button,
    .action-button {
      /* Ensure minimum touch target size */
      min-height: 44px;
      padding: var(--spacing-sm) var(--spacing-md);
    }
    
    .panel-item {
      /* Easier to tap */
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;
    }
    
    .panel-item:active {
      background-color: var(--bg-tertiary);
    }
  }
  
  /* Container queries for responsive content */
  @supports (container-type: inline-size) {
    .manager-content {
      container-type: inline-size;
    }
    
    @container (max-width: 350px) {
      .section-header {
        flex-direction: column;
        align-items: stretch;
        gap: var(--spacing-sm);
      }
      
      .create-button {
        width: 100%;
      }
    }
  }
  
  /* High contrast mode support */
  @media (prefers-contrast: high) {
    .panel-item {
      border-width: 2px;
    }
    
    .manager-button:focus,
    .close-button:focus,
    .open-button:focus {
      outline: 2px solid var(--accent-color);
      outline-offset: 2px;
    }
  }
  
  /* Reduced motion support */
  @media (prefers-reduced-motion: reduce) {
    .panel-manager {
      animation: none;
    }
    
    .manager-button,
    .panel-item,
    .open-button {
      transition: none;
    }
  }
</style>