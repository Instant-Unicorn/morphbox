<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import type { LoadedCustomPanel } from './custom-loader';
  import { loadedCustomPanels } from './custom-loader';
  import { get } from 'svelte/store';
  
  export let panel: any; // This is the panel from the store
  export let panelId: string;
  export let data: any = {};
  
  let error: string | null = null;
  let componentInstance: any = null;
  let container: HTMLDivElement;
  let customPanel: LoadedCustomPanel | undefined;
  
  // For now, we'll use a simpler approach - dynamic component loading
  // In production, you'd want to use proper sandboxing
  
  async function loadPanel() {
    try {
      error = null;
      
      // Find the custom panel by type
      const customPanels = get(loadedCustomPanels);
      customPanel = customPanels.find(p => p.metadata.id === panel.type);
      
      if (!customPanel) {
        throw new Error(`Custom panel not found: ${panel.type}`);
      }
      
      // If component is loaded (even if placeholder), use it
      if (customPanel.component) {
        if (container && customPanel.component) {
          componentInstance = new customPanel.component({
            target: container,
            props: {
              panelId,
              data
            }
          });
        }
        return;
      }
      
      // Otherwise, show error
      throw new Error('Panel component not loaded');
      
    } catch (err) {
      console.error('Failed to load custom panel:', err);
      error = err instanceof Error ? err.message : 'Unknown error';
    }
  }
  
  onMount(() => {
    loadPanel();
  });
  
  onDestroy(() => {
    if (componentInstance && componentInstance.$destroy) {
      componentInstance.$destroy();
    }
  });
</script>

<div class="custom-panel-wrapper" bind:this={container}>
  {#if error}
    <div class="error">
      <h3>Error loading panel: {panel.title || panel.type}</h3>
      <p>{error}</p>
      <details>
        <summary>Panel Info</summary>
        <pre>{JSON.stringify({ type: panel.type, id: panelId }, null, 2)}</pre>
      </details>
    </div>
  {/if}
</div>

<style>
  .custom-panel-wrapper {
    width: 100%;
    height: 100%;
    position: relative;
    overflow: auto;
  }
  
  .error {
    padding: 20px;
    color: var(--error-color, #f44336);
    background: rgba(244, 67, 54, 0.1);
    border: 1px solid rgba(244, 67, 54, 0.3);
    border-radius: 4px;
    margin: 20px;
  }
  
  .error h3 {
    margin: 0 0 10px 0;
    font-size: 16px;
  }
  
  .error p {
    margin: 0 0 10px 0;
  }
  
  .error details {
    margin-top: 10px;
  }
  
  .error summary {
    cursor: pointer;
    user-select: none;
    font-weight: 500;
  }
  
  .error pre {
    margin: 10px 0 0 0;
    padding: 10px;
    background: var(--bg-secondary);
    border-radius: 4px;
    font-size: 12px;
    overflow: auto;
  }
</style>