// Export all panel components and types
export { default as BasePanel } from './BasePanel.svelte';
export * from './types';

// Panel registry for dynamic panel loading
import type { PanelConfig } from './types';

const panelRegistry = new Map<string, PanelConfig>();

/**
 * Register a panel configuration
 * @param config - The panel configuration to register
 */
export function registerPanel(config: PanelConfig): void {
  if (panelRegistry.has(config.id)) {
    console.warn(`Panel with id "${config.id}" is already registered. Overwriting...`);
  }
  panelRegistry.set(config.id, config);
}

/**
 * Unregister a panel by its ID
 * @param id - The ID of the panel to unregister
 */
export function unregisterPanel(id: string): void {
  panelRegistry.delete(id);
}

/**
 * Get a panel configuration by its ID
 * @param id - The ID of the panel to retrieve
 * @returns The panel configuration or undefined if not found
 */
export function getPanel(id: string): PanelConfig | undefined {
  return panelRegistry.get(id);
}

/**
 * Get all registered panel configurations
 * @returns An array of all registered panel configurations
 */
export function getAllPanels(): PanelConfig[] {
  return Array.from(panelRegistry.values());
}

/**
 * Check if a panel is registered
 * @param id - The ID of the panel to check
 * @returns True if the panel is registered, false otherwise
 */
export function isPanelRegistered(id: string): boolean {
  return panelRegistry.has(id);
}