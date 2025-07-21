<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import type { SvelteComponent } from 'svelte';
  import * as svelte from 'svelte/compiler';
  
  export let panelId: string;
  export let source: string;
  export let data: any = {};
  
  let container: HTMLDivElement;
  let componentInstance: SvelteComponent | null = null;
  let error: string | null = null;
  
  async function compileAndMount() {
    try {
      error = null;
      
      // Extract the script, style, and template parts
      const scriptMatch = source.match(/<script[^>]*>([\s\S]*?)<\/script>/);
      const styleMatch = source.match(/<style[^>]*>([\s\S]*?)<\/style>/);
      const templateMatch = source.replace(/<script[^>]*>[\s\S]*?<\/script>/, '')
                                  .replace(/<style[^>]*>[\s\S]*?<\/style>/, '')
                                  .replace(/<!--[\s\S]*?-->/, '')
                                  .trim();
      
      if (!templateMatch) {
        throw new Error('No template found in panel source');
      }
      
      // Compile the component
      const compiled = svelte.compile(source, {
        filename: `${panelId}.svelte`,
        generate: 'dom',
        css: 'injected'
      });
      
      // Create a module from the compiled code
      const module = new Function(
        'exports',
        'require',
        'module',
        '__filename',
        '__dirname',
        compiled.js.code
      );
      
      // Create a fake module environment
      const exports: any = {};
      const fakeModule = { exports };
      
      // Provide required imports
      const require = (id: string) => {
        switch (id) {
          case 'svelte':
            return svelte;
          case 'svelte/internal':
            return import('svelte/internal');
          case 'svelte/store':
            return import('svelte/store');
          default:
            throw new Error(`Cannot require module: ${id}`);
        }
      };
      
      // Execute the module
      module(exports, require, fakeModule, `${panelId}.svelte`, '.');
      
      // Get the component class
      const Component = fakeModule.exports.default || fakeModule.exports;
      
      // Mount the component
      if (container) {
        componentInstance = new Component({
          target: container,
          props: {
            panelId,
            data
          }
        });
      }
    } catch (err) {
      console.error('Failed to compile/mount custom panel:', err);
      error = err instanceof Error ? err.message : 'Unknown error';
    }
  }
  
  onMount(() => {
    compileAndMount();
  });
  
  onDestroy(() => {
    if (componentInstance) {
      componentInstance.$destroy();
    }
  });
  
  // Re-compile if source changes
  $: if (source && container) {
    if (componentInstance) {
      componentInstance.$destroy();
    }
    compileAndMount();
  }
</script>

<div class="custom-panel-loader" bind:this={container}>
  {#if error}
    <div class="error">
      <h3>Error loading panel</h3>
      <pre>{error}</pre>
    </div>
  {/if}
</div>

<style>
  .custom-panel-loader {
    width: 100%;
    height: 100%;
    position: relative;
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
  
  .error pre {
    margin: 0;
    white-space: pre-wrap;
    font-size: 12px;
    font-family: monospace;
  }
</style>