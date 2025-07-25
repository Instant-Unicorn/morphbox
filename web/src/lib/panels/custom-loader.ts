/**
 * Custom Panel Loader
 * 
 * This module handles loading custom panels from the user's home directory
 * at ~/morphbox/panels. Each panel is a single .svelte file with embedded
 * metadata.
 */

import { writable, derived, get } from 'svelte/store';
import type { ComponentType, SvelteComponent } from 'svelte';
import { panelRegistry } from './registry';
import type { PanelDefinition } from './registry';

export interface CustomPanelMetadata {
  id: string;
  name: string;
  description: string;
  version: string;
  author?: string;
  icon?: string;
  features: string[];
  defaultSize?: { width: number; height: number };
  persistent?: boolean;
}

export interface LoadedCustomPanel {
  metadata: CustomPanelMetadata;
  component: ComponentType<SvelteComponent>;
  path: string;
  source: string;
}

// Store for loaded custom panels
const customPanelsStore = writable<Map<string, LoadedCustomPanel>>(new Map());

// Derived store for easy access to custom panels list
export const loadedCustomPanels = derived(
  customPanelsStore,
  $store => Array.from($store.values())
);

// Directory where custom panels are stored
export const CUSTOM_PANELS_DIR = '~/morphbox/panels';

/**
 * Parse metadata from Svelte component source
 * Looks for a special comment block at the top of the file
 */
function parseMetadata(source: string): CustomPanelMetadata | null {
  // Look for metadata in a special comment format
  const metadataRegex = /<!--\s*@morphbox-panel\s*([\s\S]*?)-->/;
  const match = source.match(metadataRegex);
  
  if (!match) return null;
  
  try {
    // Parse YAML-like format
    const metadataText = match[1];
    const metadata: any = {};
    
    // Simple parser for YAML-like format
    const lines = metadataText.split('\n');
    for (const line of lines) {
      const colonIndex = line.indexOf(':');
      if (colonIndex === -1) continue;
      
      const key = line.substring(0, colonIndex).trim();
      const value = line.substring(colonIndex + 1).trim();
      
      if (!key) continue;
      
      // Handle arrays
      if (value.startsWith('[') && value.endsWith(']')) {
        metadata[key] = value
          .slice(1, -1)
          .split(',')
          .map(v => v.trim().replace(/['"]/g, ''));
      }
      // Handle objects
      else if (value.startsWith('{') && value.endsWith('}')) {
        try {
          metadata[key] = JSON.parse(value);
        } catch {
          metadata[key] = value;
        }
      }
      // Handle booleans
      else if (value === 'true' || value === 'false') {
        metadata[key] = value === 'true';
      }
      // Handle numbers
      else if (!isNaN(Number(value))) {
        metadata[key] = Number(value);
      }
      // Handle strings
      else {
        metadata[key] = value.replace(/['"]/g, '');
      }
    }
    
    // Validate required fields
    if (!metadata.id || !metadata.name) {
      throw new Error('Missing required metadata fields: id and name');
    }
    
    // Set defaults
    metadata.description = metadata.description || '';
    metadata.features = metadata.features || [];
    metadata.version = metadata.version || '1.0.0';
    
    return metadata as CustomPanelMetadata;
  } catch (error) {
    console.error('Failed to parse panel metadata:', error);
    return null;
  }
}

/**
 * Load a custom panel from file
 */
async function loadCustomPanel(filePath: string): Promise<LoadedCustomPanel | null> {
  try {
    // Fetch the panel source code
    const response = await fetch(`/api/custom-panels/load?path=${encodeURIComponent(filePath)}`);
    if (!response.ok) {
      throw new Error(`Failed to load panel: ${response.statusText}`);
    }
    
    const source = await response.text();
    
    // Parse metadata
    const metadata = parseMetadata(source);
    if (!metadata) {
      throw new Error('Invalid panel metadata');
    }
    
    // Compile the Svelte component
    // In a real implementation, this would use the Svelte compiler
    // For now, we'll use dynamic imports with a custom loader
    const module = await compileAndLoadPanel(source, metadata.id);
    
    return {
      metadata,
      component: module.default,
      path: filePath,
      source
    };
  } catch (error) {
    console.error(`Failed to load custom panel from ${filePath}:`, error);
    return null;
  }
}

/**
 * Compile and load a Svelte component from source
 * For now, we'll return a placeholder component that displays the panel info
 */
async function compileAndLoadPanel(source: string, id: string): Promise<any> {
  // Parse the panel content (excluding metadata)
  const contentMatch = source.match(/-->([\s\S]*)/);
  const content = contentMatch ? contentMatch[1].trim() : '';
  
  // For development, we'll use a placeholder component
  // In production, this would be compiled on the server
  return {
    default: class PlaceholderPanel {
      constructor(options: any) {
        const { target, props } = options;
        
        // Create a simple placeholder UI
        const div = document.createElement('div');
        div.style.cssText = 'padding: 20px; height: 100%; overflow: auto;';
        div.innerHTML = `
          <div style="text-align: center; color: var(--text-secondary);">
            <h3 style="color: var(--text-primary); margin-bottom: 10px;">Custom Panel: ${id}</h3>
            <p style="margin-bottom: 20px;">This panel requires server-side compilation.</p>
            <details style="text-align: left; max-width: 500px; margin: 0 auto;">
              <summary style="cursor: pointer; padding: 10px; background: var(--bg-secondary); border-radius: 4px;">
                View Panel Source
              </summary>
              <pre style="padding: 10px; background: var(--bg-secondary); border-radius: 4px; margin-top: 10px; overflow: auto; font-size: 12px;">${content.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
            </details>
          </div>
        `;
        
        target.appendChild(div);
        
        // Store for cleanup
        this._element = div;
      }
      
      $destroy() {
        if (this._element && this._element.parentNode) {
          this._element.parentNode.removeChild(this._element);
        }
      }
      
      _element: HTMLElement | null = null;
    }
  };
}

/**
 * Scan and load all custom panels from the panels directory
 */
export async function scanCustomPanels(): Promise<void> {
  try {
    // Get list of panel files from the server
    const response = await fetch('/api/custom-panels/list');
    if (!response.ok) {
      throw new Error(`Failed to list custom panels: ${response.statusText}`);
    }
    
    const files: string[] = await response.json();
    
    // Load each panel
    const loadedPanels = new Map<string, LoadedCustomPanel>();
    
    for (const file of files) {
      if (!file.endsWith('.svelte')) continue;
      
      const panel = await loadCustomPanel(file);
      if (panel) {
        loadedPanels.set(panel.metadata.id, panel);
        
        // Register with the panel registry
        const definition: PanelDefinition = {
          id: panel.metadata.id,
          name: panel.metadata.name,
          description: panel.metadata.description,
          component: panel.component,
          path: panel.path,
          features: panel.metadata.features,
          createdAt: new Date(),
          isCustom: true
        };
        
        panelRegistry.register(definition);
      }
    }
    
    // Update the store
    customPanelsStore.set(loadedPanels);
  } catch (error) {
    console.error('Failed to scan custom panels:', error);
  }
}

/**
 * Watch for changes in the custom panels directory
 */
export function watchCustomPanels(): void {
  if (typeof window === 'undefined') return;
  
  // Use server-sent events or WebSocket for real-time updates
  const eventSource = new EventSource('/api/custom-panels/watch');
  
  eventSource.addEventListener('change', async (event) => {
    const data = JSON.parse(event.data);
    
    switch (data.type) {
      case 'add':
      case 'change':
        // Reload the specific panel
        const panel = await loadCustomPanel(data.path);
        if (panel) {
          customPanelsStore.update(store => {
            store.set(panel.metadata.id, panel);
            return store;
          });
          
          // Update registry
          const definition: PanelDefinition = {
            id: panel.metadata.id,
            name: panel.metadata.name,
            description: panel.metadata.description,
            component: panel.component,
            path: panel.path,
            features: panel.metadata.features,
            createdAt: new Date(),
            isCustom: true
          };
          
          panelRegistry.register(definition);
        }
        break;
        
      case 'unlink':
        // Remove the panel
        const panels = get(customPanelsStore);
        for (const [id, p] of panels) {
          if (p.path === data.path) {
            customPanelsStore.update(store => {
              store.delete(id);
              return store;
            });
            panelRegistry.unregister(id);
            break;
          }
        }
        break;
    }
  });
  
  eventSource.addEventListener('error', () => {
    console.error('Lost connection to custom panels watcher');
    // Attempt to reconnect after a delay
    setTimeout(() => watchCustomPanels(), 5000);
  });
}

/**
 * Create a new custom panel from a template
 */
export async function createCustomPanel(
  name: string,
  description: string,
  template: 'basic' | 'api' | 'chart' | 'form'
): Promise<boolean> {
  try {
    const response = await fetch('/api/custom-panels/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name,
        description,
        template
      })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to create panel: ${response.statusText}`);
    }
    
    // Reload panels to include the new one
    await scanCustomPanels();
    
    return true;
  } catch (error) {
    console.error('Failed to create custom panel:', error);
    return false;
  }
}

/**
 * Initialize custom panel system
 */
export function initializeCustomPanels(): void {
  if (typeof window === 'undefined') return;
  
  // Scan for panels on startup
  scanCustomPanels().then(() => {
    console.log('[CustomPanelLoader] Initial scan complete');
  });
  
  // Start watching for changes
  watchCustomPanels();
}

/**
 * Load custom panels metadata from the server
 */
export async function loadCustomPanelsMetadata(): Promise<void> {
  try {
    // Get list of custom panels
    const response = await fetch('/api/custom-panels/list');
    if (!response.ok) {
      console.error('Failed to list custom panels');
      return;
    }
    
    const panelPaths: string[] = await response.json();
    console.log('[loadCustomPanelsMetadata] Found panel paths:', panelPaths);
    
    // Load metadata for each panel
    for (const path of panelPaths) {
      // Extract ID based on file extension
      const id = path.split('/').pop()?.replace(/\.(svelte|morph)$/, '');
      if (!id) continue;
      
      try {
        console.log(`[loadCustomPanelsMetadata] Loading metadata for panel: ${id}`);
        
        // Try to get metadata
        const metadataResponse = await fetch(`/api/custom-panels/metadata/${id}`);
        if (metadataResponse.ok) {
          const metadata = await metadataResponse.json();
          console.log(`[loadCustomPanelsMetadata] Loaded metadata for ${id}:`, metadata);
          
          // Register the panel - IMPORTANT: use the filename-based ID, not metadata.id
          const panelId = id; // This is the filename without extension
          const definition: PanelDefinition = {
            id: panelId, // Always use the filename as the ID
            name: metadata.name || id,
            description: metadata.description || 'Custom panel',
            component: null, // Will be loaded on demand
            path: path,
            features: metadata.features || [],
            createdAt: metadata.createdAt ? new Date(metadata.createdAt) : new Date(),
            isCustom: true
          };
          
          console.log(`[loadCustomPanelsMetadata] Registering panel definition:`, definition);
          panelRegistry.register(definition);
        } else {
          console.error(`[loadCustomPanelsMetadata] Failed to load metadata for ${id}: ${metadataResponse.status} ${metadataResponse.statusText}`);
        }
      } catch (error) {
        console.error(`Failed to load metadata for panel ${id}:`, error);
      }
    }
    
    console.log('[loadCustomPanelsMetadata] Loading complete');
  } catch (error) {
    console.error('Failed to load custom panels metadata:', error);
  }
}