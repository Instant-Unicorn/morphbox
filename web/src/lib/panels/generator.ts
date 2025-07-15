import { panelRegistry } from './registry';
import type { PanelDefinition } from './registry';

export interface GeneratedPanel {
  id: string;
  name: string;
  description: string;
  fileName: string;
  filePath: string;
  code: string;
  features: string[];
}

/**
 * Save generated panel code to the file system
 * In a real implementation, this would make an API call to the server
 * to write the file. For now, it registers the panel in the registry.
 */
export async function saveGeneratedPanel(panel: GeneratedPanel): Promise<boolean> {
  try {
    // In a real implementation, make an API call to save the file
    // await fetch('/api/panels/save', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({
    //     path: panel.filePath,
    //     content: panel.code
    //   })
    // });

    // Register the panel in the registry
    const definition: PanelDefinition = {
      id: panel.id,
      name: panel.name,
      description: panel.description,
      component: null, // Will be loaded dynamically
      path: panel.filePath,
      features: panel.features,
      createdAt: new Date(),
      isCustom: true
    };

    panelRegistry.register(definition);
    
    // Store the generated code in localStorage (temporary solution)
    const generatedPanels = getGeneratedPanels();
    generatedPanels[panel.id] = panel;
    localStorage.setItem('generated-panels', JSON.stringify(generatedPanels));

    return true;
  } catch (error) {
    console.error('Failed to save panel:', error);
    return false;
  }
}

/**
 * Get all generated panels from localStorage
 */
export function getGeneratedPanels(): Record<string, GeneratedPanel> {
  const saved = localStorage.getItem('generated-panels');
  if (!saved) return {};
  
  try {
    return JSON.parse(saved);
  } catch {
    return {};
  }
}

/**
 * Get generated panel code by ID
 */
export function getGeneratedPanelCode(id: string): string | null {
  const panels = getGeneratedPanels();
  return panels[id]?.code || null;
}

/**
 * Delete a generated panel
 */
export async function deleteGeneratedPanel(id: string): Promise<boolean> {
  try {
    // Unregister from registry
    panelRegistry.unregister(id);
    
    // Remove from localStorage
    const panels = getGeneratedPanels();
    delete panels[id];
    localStorage.setItem('generated-panels', JSON.stringify(panels));
    
    return true;
  } catch (error) {
    console.error('Failed to delete panel:', error);
    return false;
  }
}

/**
 * Export a generated panel's code
 */
export function exportPanelCode(id: string): void {
  const code = getGeneratedPanelCode(id);
  if (!code) return;
  
  const panel = panelRegistry.get(id);
  if (!panel) return;
  
  // Create a blob and download it
  const blob = new Blob([code], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${toKebabCase(panel.name)}.svelte`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Convert string to kebab-case
 */
function toKebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}