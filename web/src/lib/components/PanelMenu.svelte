<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { fade, fly } from 'svelte/transition';
  import { clickOutside } from './actions/clickOutside';
  import type { PanelConfig } from '$lib/panels/types';

  export let availablePanels: PanelConfig[] = [];
  export let activePanels: string[] = [];

  const dispatch = createEventDispatcher();

  // Menu state
  let isMenuOpen = false;
  let activeModal: 'create' | 'add' | 'remove' | 'manage' | null = null;

  // Panel creation form state
  let newPanelName = '';
  let newPanelType = 'custom';
  let newPanelIcon = '';
  let selectedPanelToAdd = '';
  let selectedPanelToRemove = '';

  // Toggle menu
  function toggleMenu() {
    isMenuOpen = !isMenuOpen;
  }

  // Close menu
  function closeMenu() {
    isMenuOpen = false;
  }

  // Open modal
  function openModal(type: typeof activeModal) {
    activeModal = type;
    closeMenu();
  }

  // Close modal
  function closeModal() {
    activeModal = null;
    // Reset form states
    newPanelName = '';
    newPanelType = 'custom';
    newPanelIcon = '';
    selectedPanelToAdd = '';
    selectedPanelToRemove = '';
  }

  // Handle panel creation
  function handleCreatePanel() {
    if (newPanelName.trim()) {
      dispatch('createPanel', {
        name: newPanelName,
        type: newPanelType,
        icon: newPanelIcon
      });
      closeModal();
    }
  }

  // Handle adding existing panel
  function handleAddPanel() {
    if (selectedPanelToAdd) {
      dispatch('addPanel', { id: selectedPanelToAdd });
      closeModal();
    }
  }

  // Handle removing panel
  function handleRemovePanel() {
    if (selectedPanelToRemove) {
      dispatch('removePanel', { id: selectedPanelToRemove });
      closeModal();
    }
  }

  // Get active panel info
  function getActivePanelInfo(id: string) {
    return availablePanels.find(p => p.id === id);
  }

  // Panel type options
  const panelTypes = [
    { value: 'custom', label: 'Custom Panel', icon: '📝' },
    { value: 'terminal', label: 'Terminal', icon: '💻' },
    { value: 'editor', label: 'Code Editor', icon: '✏️' },
    { value: 'browser', label: 'Browser', icon: '🌐' },
    { value: 'files', label: 'File Explorer', icon: '📁' },
    { value: 'console', label: 'Console', icon: '🖥️' },
    { value: 'output', label: 'Output', icon: '📤' },
    { value: 'debug', label: 'Debug', icon: '🐛' }
  ];

  // Available icons
  const iconOptions = ['📝', '💻', '✏️', '🌐', '📁', '🖥️', '📤', '🐛', '🔧', '⚙️', '📊', '📈'];
</script>

<!-- Menu Trigger Button -->
<div class="panel-menu-container">
  <button 
    class="menu-trigger"
    class:open={isMenuOpen}
    on:click={toggleMenu}
    aria-label="Panel menu"
    aria-expanded={isMenuOpen}
  >
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M8 3V13M3 8H13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    </svg>
  </button>

  <!-- Dropdown Menu -->
  {#if isMenuOpen}
    <div 
      class="dropdown-menu"
      use:clickOutside={closeMenu}
      transition:fly={{ y: -5, duration: 200 }}
    >
      <button class="menu-item" on:click={() => openModal('create')}>
        <span class="menu-icon">✨</span>
        <span>Create Panel</span>
      </button>
      <button class="menu-item" on:click={() => openModal('add')}>
        <span class="menu-icon">➕</span>
        <span>Add Panel</span>
      </button>
      <button 
        class="menu-item" 
        on:click={() => openModal('remove')}
        disabled={activePanels.length === 0}
      >
        <span class="menu-icon">➖</span>
        <span>Remove Panel</span>
      </button>
      <div class="menu-divider"></div>
      <button class="menu-item" on:click={() => openModal('manage')}>
        <span class="menu-icon">⚙️</span>
        <span>Manage Panels</span>
      </button>
    </div>
  {/if}
</div>

<!-- Modal Backdrop -->
{#if activeModal}
  <div 
    class="modal-backdrop" 
    on:click={closeModal}
    on:keydown={(e) => e.key === 'Escape' && closeModal()}
    role="button"
    tabindex="-1"
    aria-label="Close modal"
    transition:fade={{ duration: 200 }}
  />
{/if}

<!-- Create Panel Modal -->
{#if activeModal === 'create'}
  <div 
    class="modal"
    role="dialog"
    aria-modal="true"
    aria-labelledby="create-panel-title"
    transition:fly={{ y: 20, duration: 300 }}
  >
    <div class="modal-header">
      <h2 id="create-panel-title">Create New Panel</h2>
      <button class="close-button" on:click={closeModal} aria-label="Close">
        <svg width="16" height="16" viewBox="0 0 16 16">
          <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </button>
    </div>
    
    <div class="modal-content">
      <div class="form-group">
        <label for="panel-name">Panel Name</label>
        <input 
          id="panel-name"
          type="text" 
          bind:value={newPanelName}
          placeholder="Enter panel name"
          class="form-input"
        />
      </div>

      <div class="form-group">
        <label for="panel-type">Panel Type</label>
        <select 
          id="panel-type"
          bind:value={newPanelType}
          class="form-select"
        >
          {#each panelTypes as type}
            <option value={type.value}>
              {type.icon} {type.label}
            </option>
          {/each}
        </select>
      </div>

      <div class="form-group">
        <label>Panel Icon</label>
        <div class="icon-grid">
          {#each iconOptions as icon}
            <button
              class="icon-option"
              class:selected={newPanelIcon === icon}
              on:click={() => newPanelIcon = icon}
            >
              {icon}
            </button>
          {/each}
        </div>
      </div>
    </div>

    <div class="modal-footer">
      <button class="btn-secondary" on:click={closeModal}>Cancel</button>
      <button 
        class="btn-primary" 
        on:click={handleCreatePanel}
        disabled={!newPanelName.trim()}
      >
        Create Panel
      </button>
    </div>
  </div>
{/if}

<!-- Add Panel Modal -->
{#if activeModal === 'add'}
  <div 
    class="modal"
    role="dialog"
    aria-modal="true"
    aria-labelledby="add-panel-title"
    transition:fly={{ y: 20, duration: 300 }}
  >
    <div class="modal-header">
      <h2 id="add-panel-title">Add Panel</h2>
      <button class="close-button" on:click={closeModal} aria-label="Close">
        <svg width="16" height="16" viewBox="0 0 16 16">
          <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </button>
    </div>
    
    <div class="modal-content">
      <p class="modal-description">Select a panel from the gallery to add to your workspace</p>
      
      <div class="panel-gallery">
        {#each availablePanels.filter(p => !activePanels.includes(p.id)) as panel}
          <button
            class="panel-card"
            class:selected={selectedPanelToAdd === panel.id}
            on:click={() => selectedPanelToAdd = panel.id}
          >
            <div class="panel-icon">{panel.icon || '📋'}</div>
            <div class="panel-info">
              <div class="panel-title">{panel.title}</div>
              <div class="panel-id">{panel.id}</div>
            </div>
          </button>
        {:else}
          <div class="empty-state">
            <p>No available panels to add</p>
            <p class="hint">All panels are already active or none are registered</p>
          </div>
        {/each}
      </div>
    </div>

    <div class="modal-footer">
      <button class="btn-secondary" on:click={closeModal}>Cancel</button>
      <button 
        class="btn-primary" 
        on:click={handleAddPanel}
        disabled={!selectedPanelToAdd}
      >
        Add Panel
      </button>
    </div>
  </div>
{/if}

<!-- Remove Panel Modal -->
{#if activeModal === 'remove'}
  <div 
    class="modal"
    role="dialog"
    aria-modal="true"
    aria-labelledby="remove-panel-title"
    transition:fly={{ y: 20, duration: 300 }}
  >
    <div class="modal-header">
      <h2 id="remove-panel-title">Remove Panel</h2>
      <button class="close-button" on:click={closeModal} aria-label="Close">
        <svg width="16" height="16" viewBox="0 0 16 16">
          <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </button>
    </div>
    
    <div class="modal-content">
      <p class="modal-description">Select a panel to remove from your workspace</p>
      
      <div class="panel-list">
        {#each activePanels as panelId}
          {@const panel = getActivePanelInfo(panelId)}
          {#if panel}
            <button
              class="panel-item"
              class:selected={selectedPanelToRemove === panelId}
              on:click={() => selectedPanelToRemove = panelId}
            >
              <span class="panel-icon">{panel.icon || '📋'}</span>
              <span class="panel-name">{panel.title}</span>
            </button>
          {/if}
        {:else}
          <div class="empty-state">
            <p>No active panels to remove</p>
          </div>
        {/each}
      </div>
    </div>

    <div class="modal-footer">
      <button class="btn-secondary" on:click={closeModal}>Cancel</button>
      <button 
        class="btn-primary btn-danger" 
        on:click={handleRemovePanel}
        disabled={!selectedPanelToRemove}
      >
        Remove Panel
      </button>
    </div>
  </div>
{/if}

<!-- Manage Panels Modal -->
{#if activeModal === 'manage'}
  <div 
    class="modal modal-large"
    role="dialog"
    aria-modal="true"
    aria-labelledby="manage-panels-title"
    transition:fly={{ y: 20, duration: 300 }}
  >
    <div class="modal-header">
      <h2 id="manage-panels-title">Manage Panels</h2>
      <button class="close-button" on:click={closeModal} aria-label="Close">
        <svg width="16" height="16" viewBox="0 0 16 16">
          <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </button>
    </div>
    
    <div class="modal-content">
      <div class="manage-sections">
        <section class="manage-section">
          <h3>Active Panels</h3>
          <div class="panel-manage-list">
            {#each activePanels as panelId}
              {@const panel = getActivePanelInfo(panelId)}
              {#if panel}
                <div class="panel-manage-item">
                  <div class="panel-info">
                    <span class="panel-icon">{panel.icon || '📋'}</span>
                    <span class="panel-name">{panel.title}</span>
                  </div>
                  <div class="panel-actions">
                    <button 
                      class="icon-button"
                      on:click={() => dispatch('configurePanel', { id: panelId })}
                      title="Configure"
                    >
                      ⚙️
                    </button>
                    <button 
                      class="icon-button"
                      on:click={() => {
                        selectedPanelToRemove = panelId;
                        handleRemovePanel();
                      }}
                      title="Remove"
                    >
                      ❌
                    </button>
                  </div>
                </div>
              {/if}
            {:else}
              <div class="empty-state">
                <p>No active panels</p>
              </div>
            {/each}
          </div>
        </section>

        <section class="manage-section">
          <h3>Available Panels</h3>
          <div class="panel-manage-list">
            {#each availablePanels.filter(p => !activePanels.includes(p.id)) as panel}
              <div class="panel-manage-item">
                <div class="panel-info">
                  <span class="panel-icon">{panel.icon || '📋'}</span>
                  <span class="panel-name">{panel.title}</span>
                </div>
                <div class="panel-actions">
                  <button 
                    class="icon-button"
                    on:click={() => {
                      selectedPanelToAdd = panel.id;
                      handleAddPanel();
                    }}
                    title="Add to workspace"
                  >
                    ➕
                  </button>
                </div>
              </div>
            {:else}
              <div class="empty-state">
                <p>All panels are active</p>
              </div>
            {/each}
          </div>
        </section>
      </div>
    </div>

    <div class="modal-footer">
      <button class="btn-primary" on:click={closeModal}>Done</button>
    </div>
  </div>
{/if}

<style>
  /* Container */
  .panel-menu-container {
    position: relative;
  }

  /* Menu Trigger Button */
  .menu-trigger {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    padding: 0;
    background-color: transparent;
    border: 1px solid transparent;
    border-radius: 4px;
    color: #cccccc;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .menu-trigger:hover {
    background-color: #3c3c3c;
    border-color: #3e3e42;
  }

  .menu-trigger.open {
    background-color: #3c3c3c;
    border-color: #007acc;
  }

  .menu-trigger svg {
    transition: transform 0.2s ease;
  }

  .menu-trigger.open svg {
    transform: rotate(45deg);
  }

  /* Dropdown Menu */
  .dropdown-menu {
    position: absolute;
    top: calc(100% + 4px);
    right: 0;
    min-width: 200px;
    background-color: #252526;
    border: 1px solid #3e3e42;
    border-radius: 4px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    z-index: 1000;
    overflow: hidden;
  }

  .menu-item {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 8px 12px;
    background: none;
    border: none;
    color: #cccccc;
    font-size: 13px;
    text-align: left;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .menu-item:hover:not(:disabled) {
    background-color: #2a2d2e;
  }

  .menu-item:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .menu-icon {
    width: 16px;
    text-align: center;
  }

  .menu-divider {
    height: 1px;
    margin: 4px 0;
    background-color: #3e3e42;
  }

  /* Modal Styles */
  .modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    z-index: 2000;
  }

  .modal {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 90%;
    max-width: 500px;
    max-height: 90vh;
    background-color: #1e1e1e;
    border: 1px solid #3e3e42;
    border-radius: 8px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
    z-index: 2001;
    display: flex;
    flex-direction: column;
  }

  .modal-large {
    max-width: 700px;
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    border-bottom: 1px solid #3e3e42;
  }

  .modal-header h2 {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: #cccccc;
  }

  .close-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    padding: 0;
    background: none;
    border: none;
    border-radius: 4px;
    color: #858585;
    cursor: pointer;
    transition: all 0.2s;
  }

  .close-button:hover {
    background-color: #3c3c3c;
    color: #cccccc;
  }

  .modal-content {
    flex: 1;
    padding: 20px;
    overflow-y: auto;
  }

  .modal-description {
    margin: 0 0 16px;
    color: #858585;
    font-size: 13px;
  }

  .modal-footer {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
    padding: 16px 20px;
    border-top: 1px solid #3e3e42;
  }

  /* Form Styles */
  .form-group {
    margin-bottom: 20px;
  }

  .form-group label {
    display: block;
    margin-bottom: 8px;
    color: #cccccc;
    font-size: 13px;
    font-weight: 500;
  }

  .form-input,
  .form-select {
    width: 100%;
    padding: 8px 12px;
    background-color: #3c3c3c;
    border: 1px solid #3e3e42;
    border-radius: 4px;
    color: #cccccc;
    font-size: 13px;
    transition: border-color 0.2s;
  }

  .form-input:focus,
  .form-select:focus {
    outline: none;
    border-color: #007acc;
  }

  .form-input::placeholder {
    color: #858585;
  }

  /* Icon Grid */
  .icon-grid {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 8px;
  }

  .icon-option {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    aspect-ratio: 1;
    background-color: #3c3c3c;
    border: 1px solid #3e3e42;
    border-radius: 4px;
    font-size: 20px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .icon-option:hover {
    background-color: #484848;
  }

  .icon-option.selected {
    background-color: #007acc;
    border-color: #007acc;
  }

  /* Panel Gallery */
  .panel-gallery {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 12px;
  }

  .panel-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 16px;
    background-color: #252526;
    border: 1px solid #3e3e42;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .panel-card:hover {
    background-color: #2a2d2e;
  }

  .panel-card.selected {
    border-color: #007acc;
    background-color: #2a2d2e;
  }

  .panel-card .panel-icon {
    font-size: 32px;
  }

  .panel-card .panel-info {
    text-align: center;
  }

  .panel-card .panel-title {
    color: #cccccc;
    font-size: 13px;
    font-weight: 500;
  }

  .panel-card .panel-id {
    color: #858585;
    font-size: 11px;
    margin-top: 2px;
  }

  /* Panel List */
  .panel-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .panel-item {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 12px;
    background-color: #252526;
    border: 1px solid #3e3e42;
    border-radius: 4px;
    color: #cccccc;
    font-size: 13px;
    text-align: left;
    cursor: pointer;
    transition: all 0.2s;
  }

  .panel-item:hover {
    background-color: #2a2d2e;
  }

  .panel-item.selected {
    border-color: #007acc;
    background-color: #2a2d2e;
  }

  .panel-item .panel-icon {
    font-size: 16px;
  }

  /* Manage Panels */
  .manage-sections {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
  }

  .manage-section h3 {
    margin: 0 0 12px;
    color: #cccccc;
    font-size: 14px;
    font-weight: 600;
  }

  .panel-manage-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .panel-manage-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    background-color: #252526;
    border: 1px solid #3e3e42;
    border-radius: 4px;
  }

  .panel-manage-item .panel-info {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .panel-manage-item .panel-icon {
    font-size: 16px;
  }

  .panel-manage-item .panel-name {
    color: #cccccc;
    font-size: 13px;
  }

  .panel-actions {
    display: flex;
    gap: 4px;
  }

  .icon-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    padding: 0;
    background: none;
    border: none;
    border-radius: 4px;
    font-size: 14px;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .icon-button:hover {
    background-color: #3c3c3c;
  }

  /* Empty State */
  .empty-state {
    padding: 24px;
    text-align: center;
    color: #858585;
    font-size: 13px;
  }

  .empty-state p {
    margin: 0;
  }

  .empty-state .hint {
    margin-top: 4px;
    font-size: 12px;
    opacity: 0.8;
  }

  /* Button Styles */
  .btn-primary,
  .btn-secondary {
    padding: 8px 16px;
    border: none;
    border-radius: 4px;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-primary {
    background-color: #007acc;
    color: #ffffff;
  }

  .btn-primary:hover:not(:disabled) {
    background-color: #0062a3;
  }

  .btn-primary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn-primary.btn-danger {
    background-color: #f14c4c;
  }

  .btn-primary.btn-danger:hover:not(:disabled) {
    background-color: #cd3d3d;
  }

  .btn-secondary {
    background-color: #3c3c3c;
    color: #cccccc;
    border: 1px solid #3e3e42;
  }

  .btn-secondary:hover {
    background-color: #484848;
  }

  /* Mobile Responsive */
  @media (max-width: 768px) {
    .modal {
      width: 95%;
      max-height: 95vh;
    }

    .manage-sections {
      grid-template-columns: 1fr;
    }

    .icon-grid {
      grid-template-columns: repeat(4, 1fr);
    }
  }
</style>