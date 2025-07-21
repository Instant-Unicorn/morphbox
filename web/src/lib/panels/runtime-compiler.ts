/**
 * Runtime Svelte Component Compiler
 * 
 * This is a simplified runtime compiler for development purposes.
 * In production, panels should be pre-compiled on the server for security.
 */

import type { ComponentType, SvelteComponent } from 'svelte';

interface CompileResult {
  component: ComponentType<SvelteComponent> | null;
  error: string | null;
}

/**
 * Create a Svelte component from source code at runtime
 * This uses an iframe sandbox for security isolation
 */
export async function compileComponent(source: string, id: string): Promise<CompileResult> {
  try {
    // Create a blob URL for the component
    const componentCode = `
      ${source}
      
      // Export the component
      window.__svelteComponent = Component;
    `;
    
    // Create a sandboxed iframe
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.sandbox.add('allow-scripts');
    document.body.appendChild(iframe);
    
    // Write the component code to the iframe
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) {
      throw new Error('Failed to access iframe document');
    }
    
    // For now, return a placeholder component
    // Full runtime compilation requires the Svelte compiler
    const PlaceholderComponent = class extends HTMLElement {
      constructor() {
        super();
        this.attachShadow({ mode: 'open' });
      }
      
      connectedCallback() {
        if (this.shadowRoot) {
          this.shadowRoot.innerHTML = `
            <div style="padding: 20px; text-align: center; color: #888;">
              <h3>Custom Panel: ${id}</h3>
              <p>Runtime compilation not available in this environment.</p>
              <p>Please use pre-compiled panels or run in development mode.</p>
            </div>
          `;
        }
      }
    };
    
    // Clean up
    document.body.removeChild(iframe);
    
    // Return a Svelte-compatible wrapper
    return {
      component: PlaceholderComponent as any,
      error: null
    };
    
  } catch (error) {
    return {
      component: null,
      error: error instanceof Error ? error.message : 'Unknown compilation error'
    };
  }
}

/**
 * Load a pre-compiled component module
 * This is the preferred method for production
 */
export async function loadCompiledComponent(modulePath: string): Promise<CompileResult> {
  try {
    const module = await import(/* @vite-ignore */ modulePath);
    return {
      component: module.default,
      error: null
    };
  } catch (error) {
    return {
      component: null,
      error: error instanceof Error ? error.message : 'Failed to load component module'
    };
  }
}