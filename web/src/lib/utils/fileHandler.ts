import { panelStore } from '$lib/stores/panels';
import { get } from 'svelte/store';

export async function handleFileOpen(event: CustomEvent<{ path: string; targetPanelId?: string }>) {
  const { path, targetPanelId } = event.detail;
  
  // If no target panel specified, try to find an existing editor
  let targetPanel = targetPanelId ? 
    get(panelStore).panels.find(p => p.id === targetPanelId) : 
    null;
  
  // If target panel doesn't exist or is not suitable, create or find an editor
  if (!targetPanel || !['editor', 'codeEditor', 'code-editor', 'preview', 'terminal', 'claude'].includes(targetPanel.type)) {
    // Look for an existing editor
    targetPanel = get(panelStore).panels.find(p => 
      p.type === 'editor' || p.type === 'codeEditor' || p.type === 'code-editor'
    );
    
    // If no editor exists, create one
    if (!targetPanel) {
      panelStore.addPanel('codeEditor', {
        title: 'Code Editor',
        content: { filePath: path }
      });
      return;
    }
  }
  
  // Open the file in the target panel
  if (targetPanel.type === 'editor' || targetPanel.type === 'codeEditor' || targetPanel.type === 'code-editor') {
    // Update the editor with the new file
    panelStore.updatePanel(targetPanel.id, {
      content: { 
        ...targetPanel.content,
        filePath: path,
        activeFile: path
      }
    });
  } else if (targetPanel.type === 'terminal') {
    // For terminal, we might want to cd to the directory or run a command
    console.log('Opening in terminal:', path);
    // Terminal integration would go here
  } else if (targetPanel.type === 'claude') {
    // For Claude, we might want to add the file to context
    console.log('Adding to Claude context:', path);
    // Claude integration would go here
  } else if (targetPanel.type === 'preview') {
    // For preview panel, show a preview of the file
    panelStore.updatePanel(targetPanel.id, {
      content: { 
        ...targetPanel.content,
        filePath: path
      }
    });
  }
  
  // Focus the target panel
  panelStore.setActivePanel(targetPanel.id);
}