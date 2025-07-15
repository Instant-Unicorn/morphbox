<script lang="ts">
  import { onMount, onDestroy, tick } from 'svelte';
  import { commands, isCommandPaletteVisible, type Command } from '$lib/stores/commands';
  import { clickOutside } from '$lib/components/actions/clickOutside';

  // Component state
  let searchQuery = '';
  let searchInput: HTMLInputElement;
  let commandResults: Command[] = [];
  let selectedIndex = 0;
  let isVisible = false;

  // Subscribe to visibility state
  const unsubscribeVisible = isCommandPaletteVisible.subscribe(visible => {
    isVisible = visible;
    if (visible) {
      searchQuery = '';
      selectedIndex = 0;
      searchCommands();
      // Focus the input after the modal is rendered
      tick().then(() => {
        searchInput?.focus();
      });
    }
  });

  // Keyboard event handler for global shortcuts
  function handleGlobalKeydown(event: KeyboardEvent) {
    // Ctrl+Shift+P or Cmd+Shift+P to toggle command palette
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'P') {
      event.preventDefault();
      commands.toggle();
    }
  }

  // Keyboard event handler for command palette navigation
  function handleKeydown(event: KeyboardEvent) {
    if (!isVisible) return;

    switch (event.key) {
      case 'Escape':
        event.preventDefault();
        commands.hide();
        break;
      
      case 'ArrowDown':
        event.preventDefault();
        selectedIndex = Math.min(selectedIndex + 1, commandResults.length - 1);
        scrollToSelected();
        break;
      
      case 'ArrowUp':
        event.preventDefault();
        selectedIndex = Math.max(selectedIndex - 1, 0);
        scrollToSelected();
        break;
      
      case 'Enter':
        event.preventDefault();
        if (commandResults[selectedIndex]) {
          executeCommand(commandResults[selectedIndex]);
        }
        break;
      
      case 'Tab':
        // Prevent tab from leaving the modal
        event.preventDefault();
        break;
    }
  }

  // Search for commands based on query
  function searchCommands() {
    commandResults = commands.search(searchQuery);
    selectedIndex = Math.min(selectedIndex, Math.max(0, commandResults.length - 1));
  }

  // Execute a command
  async function executeCommand(command: Command) {
    commands.hide();
    await commands.execute(command.id);
  }

  // Scroll selected item into view
  function scrollToSelected() {
    tick().then(() => {
      const selectedElement = document.querySelector('.command-item.selected');
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    });
  }

  // Handle clicking outside to close
  function handleClickOutside() {
    commands.hide();
  }

  // Handle mouse hover over command items
  function handleMouseEnter(index: number) {
    selectedIndex = index;
  }

  // Format command shortcuts for display
  function formatShortcut(shortcut?: string): string {
    if (!shortcut) return '';
    
    // Replace common modifiers with symbols
    return shortcut
      .replace(/Ctrl/g, '⌃')
      .replace(/Cmd/g, '⌘')
      .replace(/Alt/g, '⌥')
      .replace(/Shift/g, '⇧')
      .replace(/\+/g, ' ');
  }

  // Get category color for visual distinction
  function getCategoryColor(category: string): string {
    const colors: Record<string, string> = {
      'Panel': 'rgb(59, 130, 246)', // blue
      'Layout': 'rgb(34, 197, 94)', // green
      'Configuration': 'rgb(168, 85, 247)', // purple
      'Help': 'rgb(251, 146, 60)', // orange
      'File': 'rgb(236, 72, 153)', // pink
      'Navigation': 'rgb(14, 165, 233)', // sky
    };
    return colors[category] || 'rgb(107, 114, 128)'; // gray as default
  }

  // Highlight matching text in search results
  function highlightMatch(text: string, query: string): string {
    if (!query.trim()) return text;
    
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
  }

  onMount(() => {
    // Add global keyboard listener
    document.addEventListener('keydown', handleGlobalKeydown);
    document.addEventListener('keydown', handleKeydown);
    
    return () => {
      document.removeEventListener('keydown', handleGlobalKeydown);
      document.removeEventListener('keydown', handleKeydown);
    };
  });

  onDestroy(() => {
    unsubscribeVisible();
  });

  // Reactive statement to update search results
  $: if (searchQuery !== undefined) {
    searchCommands();
  }
</script>

<!-- Command Palette Modal -->
{#if isVisible}
  <div class="command-palette-overlay" role="dialog" aria-modal="true" aria-label="Command Palette">
    <div 
      class="command-palette-modal"
      use:clickOutside={handleClickOutside}
    >
      <!-- Search Input -->
      <div class="search-container">
        <div class="search-icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.35-4.35"></path>
          </svg>
        </div>
        <input
          bind:this={searchInput}
          bind:value={searchQuery}
          placeholder="Type a command or search..."
          class="search-input"
          type="text"
          autocomplete="off"
          spellcheck="false"
        />
        <div class="shortcut-hint">
          <kbd>Esc</kbd> to close
        </div>
      </div>

      <!-- Command Results -->
      <div class="command-results">
        {#if commandResults.length === 0}
          <div class="no-results">
            {#if searchQuery.trim()}
              No commands found for "<em>{searchQuery}</em>"
            {:else}
              No commands available
            {/if}
          </div>
        {:else}
          <div class="results-list">
            {#each commandResults as command, index}
              <button
                class="command-item {index === selectedIndex ? 'selected' : ''}"
                on:click={() => executeCommand(command)}
                on:mouseenter={() => handleMouseEnter(index)}
                disabled={command.disabled}
              >
                <div class="command-content">
                  <div class="command-main">
                    <div class="command-icon-title">
                      {#if command.icon}
                        <span class="command-icon">{command.icon}</span>
                      {/if}
                      <span class="command-title">
                        {@html highlightMatch(command.title, searchQuery)}
                      </span>
                    </div>
                    {#if command.shortcut}
                      <span class="command-shortcut">{formatShortcut(command.shortcut)}</span>
                    {/if}
                  </div>
                  <div class="command-meta">
                    <span class="command-description">
                      {@html highlightMatch(command.description, searchQuery)}
                    </span>
                    <span 
                      class="command-category"
                      style="color: {getCategoryColor(command.category)}"
                    >
                      {command.category}
                    </span>
                  </div>
                </div>
              </button>
            {/each}
          </div>
        {/if}
      </div>

      <!-- Footer -->
      <div class="command-footer">
        <div class="navigation-hints">
          <span><kbd>↑</kbd><kbd>↓</kbd> to navigate</span>
          <span><kbd>Enter</kbd> to execute</span>
          <span><kbd>Esc</kbd> to close</span>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .command-palette-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding-top: 10vh;
    z-index: 9999;
    animation: fadeIn 0.15s ease-out;
  }

  .command-palette-modal {
    background: white;
    border-radius: 12px;
    box-shadow: 
      0 20px 25px -5px rgba(0, 0, 0, 0.1),
      0 10px 10px -5px rgba(0, 0, 0, 0.04),
      0 0 0 1px rgba(0, 0, 0, 0.05);
    width: 90%;
    max-width: 640px;
    max-height: 70vh;
    display: flex;
    flex-direction: column;
    animation: slideDown 0.15s ease-out;
    overflow: hidden;
  }

  /* Dark theme support */
  @media (prefers-color-scheme: dark) {
    .command-palette-modal {
      background: #1f2937;
      color: #f9fafb;
      box-shadow: 
        0 20px 25px -5px rgba(0, 0, 0, 0.3),
        0 10px 10px -5px rgba(0, 0, 0, 0.2),
        0 0 0 1px rgba(255, 255, 255, 0.1);
    }
  }

  .search-container {
    display: flex;
    align-items: center;
    padding: 16px;
    border-bottom: 1px solid #e5e7eb;
    position: relative;
  }

  @media (prefers-color-scheme: dark) {
    .search-container {
      border-bottom-color: #374151;
    }
  }

  .search-icon {
    color: #6b7280;
    margin-right: 12px;
    flex-shrink: 0;
  }

  .search-input {
    flex: 1;
    border: none;
    outline: none;
    font-size: 16px;
    background: transparent;
    color: inherit;
  }

  .search-input::placeholder {
    color: #9ca3af;
  }

  .shortcut-hint {
    color: #6b7280;
    font-size: 12px;
    margin-left: 12px;
    flex-shrink: 0;
  }

  .command-results {
    flex: 1;
    overflow-y: auto;
    min-height: 0;
  }

  .no-results {
    padding: 32px;
    text-align: center;
    color: #6b7280;
    font-style: italic;
  }

  .results-list {
    padding: 8px 0;
  }

  .command-item {
    width: 100%;
    text-align: left;
    border: none;
    background: none;
    padding: 12px 16px;
    cursor: pointer;
    transition: background-color 0.1s ease;
    display: block;
    color: inherit;
  }

  .command-item:hover,
  .command-item.selected {
    background: #f3f4f6;
  }

  @media (prefers-color-scheme: dark) {
    .command-item:hover,
    .command-item.selected {
      background: #374151;
    }
  }

  .command-item:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .command-content {
    width: 100%;
  }

  .command-main {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 4px;
  }

  .command-icon-title {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .command-icon {
    font-size: 16px;
    line-height: 1;
  }

  .command-title {
    font-weight: 500;
    font-size: 14px;
  }

  .command-shortcut {
    font-size: 12px;
    color: #6b7280;
    font-family: monospace;
    background: #f3f4f6;
    padding: 2px 6px;
    border-radius: 4px;
  }

  @media (prefers-color-scheme: dark) {
    .command-shortcut {
      background: #4b5563;
      color: #d1d5db;
    }
  }

  .command-meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 12px;
  }

  .command-description {
    color: #6b7280;
    flex: 1;
    margin-right: 8px;
  }

  .command-category {
    font-weight: 500;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    opacity: 0.8;
  }

  .command-footer {
    padding: 12px 16px;
    border-top: 1px solid #e5e7eb;
    background: #f9fafb;
  }

  @media (prefers-color-scheme: dark) {
    .command-footer {
      border-top-color: #374151;
      background: #111827;
    }
  }

  .navigation-hints {
    display: flex;
    gap: 16px;
    font-size: 11px;
    color: #6b7280;
  }

  kbd {
    background: #e5e7eb;
    border: 1px solid #d1d5db;
    border-radius: 3px;
    padding: 1px 4px;
    font-size: 10px;
    font-family: monospace;
    margin: 0 1px;
  }

  @media (prefers-color-scheme: dark) {
    kbd {
      background: #374151;
      border-color: #4b5563;
      color: #d1d5db;
    }
  }

  /* Highlight marks in search results */
  :global(.command-palette-modal mark) {
    background: #fef3c7;
    color: #92400e;
    padding: 0 2px;
    border-radius: 2px;
  }

  @media (prefers-color-scheme: dark) {
    :global(.command-palette-modal mark) {
      background: #451a03;
      color: #fbbf24;
    }
  }

  /* Animations */
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateY(-20px) scale(0.95);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  /* Scrollbar styling */
  .command-results::-webkit-scrollbar {
    width: 6px;
  }

  .command-results::-webkit-scrollbar-track {
    background: transparent;
  }

  .command-results::-webkit-scrollbar-thumb {
    background: #d1d5db;
    border-radius: 3px;
  }

  @media (prefers-color-scheme: dark) {
    .command-results::-webkit-scrollbar-thumb {
      background: #4b5563;
    }
  }

  .command-results::-webkit-scrollbar-thumb:hover {
    background: #9ca3af;
  }

  @media (prefers-color-scheme: dark) {
    .command-results::-webkit-scrollbar-thumb:hover {
      background: #6b7280;
    }
  }
</style>