<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { EditorTab } from './types';

  export let tabs: EditorTab[] = [];
  export let activeTabId: string | null = null;

  const dispatch = createEventDispatcher();

  function handleTabClick(tabId: string) {
    dispatch('tabClick', { tabId });
  }

  function handleTabClose(e: MouseEvent, tabId: string) {
    e.stopPropagation();
    dispatch('tabClose', { tabId });
  }

  function getFileIcon(fileName: string): string {
    const ext = fileName.split('.').pop()?.toLowerCase();
    const iconMap: Record<string, string> = {
      js: '📄',
      ts: '📘',
      jsx: '⚛️',
      tsx: '⚛️',
      json: '📋',
      html: '🌐',
      css: '🎨',
      scss: '🎨',
      sass: '🎨',
      py: '🐍',
      java: '☕',
      go: '🐹',
      rs: '🦀',
      php: '🐘',
      rb: '💎',
      md: '📝',
      xml: '📃',
      yaml: '📑',
      yml: '📑',
      svelte: '🔥',
      vue: '💚',
      sql: '🗄️',
      sh: '🖥️',
      bash: '🖥️',
      zsh: '🖥️',
      git: '🔧',
      docker: '🐳',
      dockerfile: '🐳',
      env: '⚙️',
      txt: '📄',
      log: '📜',
      svg: '🖼️',
      png: '🖼️',
      jpg: '🖼️',
      jpeg: '🖼️',
      gif: '🖼️',
      ico: '🖼️'
    };

    return iconMap[ext || ''] || '📄';
  }
</script>

<div class="tab-bar">
  {#if tabs.length > 0}
    <div class="tabs">
      {#each tabs as tab (tab.id)}
        <button
          class="tab"
          class:active={tab.id === activeTabId}
          class:dirty={tab.isDirty}
          on:click={() => handleTabClick(tab.id)}
          title={tab.fileName}
        >
          <span class="tab-icon">{getFileIcon(tab.fileName)}</span>
          <span class="tab-name">{tab.fileName.split('/').pop()}</span>
          {#if tab.isDirty}
            <span class="dirty-indicator">•</span>
          {/if}
          <button
            class="close-btn"
            on:click={(e) => handleTabClose(e, tab.id)}
            title="Close"
          >
            ×
          </button>
        </button>
      {/each}
    </div>
  {:else}
    <div class="no-tabs">
      No files open
    </div>
  {/if}
</div>

<style>
  .tab-bar {
    display: flex;
    background-color: #2d2d2d;
    border-bottom: 1px solid #3e3e3e;
    overflow-x: auto;
    scrollbar-width: thin;
    scrollbar-color: #555 #2d2d2d;
  }

  .tab-bar::-webkit-scrollbar {
    height: 6px;
  }

  .tab-bar::-webkit-scrollbar-track {
    background: #2d2d2d;
  }

  .tab-bar::-webkit-scrollbar-thumb {
    background: #555;
    border-radius: 3px;
  }

  .tabs {
    display: flex;
    flex-shrink: 0;
  }

  .tab {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 12px;
    background-color: #2d2d2d;
    border: none;
    border-right: 1px solid #3e3e3e;
    color: #cccccc;
    cursor: pointer;
    font-size: 13px;
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    white-space: nowrap;
    min-width: 120px;
    max-width: 200px;
    position: relative;
    transition: background-color 0.2s;
  }

  .tab:hover {
    background-color: #383838;
  }

  .tab.active {
    background-color: #1e1e1e;
    color: #ffffff;
  }

  .tab-icon {
    font-size: 14px;
    flex-shrink: 0;
  }

  .tab-name {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    text-align: left;
  }

  .dirty-indicator {
    color: #fff;
    font-size: 20px;
    line-height: 1;
    margin-left: 4px;
  }

  .close-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    padding: 0;
    margin-left: 4px;
    background: none;
    border: none;
    border-radius: 3px;
    color: #888;
    font-size: 18px;
    line-height: 1;
    cursor: pointer;
    opacity: 0;
    transition: opacity 0.2s, background-color 0.2s;
  }

  .tab:hover .close-btn {
    opacity: 1;
  }

  .close-btn:hover {
    background-color: #4a4a4a;
    color: #fff;
  }

  .no-tabs {
    padding: 12px 20px;
    color: #888;
    font-size: 13px;
    font-style: italic;
  }
</style>