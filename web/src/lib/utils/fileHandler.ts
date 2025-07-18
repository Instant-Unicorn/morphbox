import { panelStore } from '$lib/stores/panels';
import { get } from 'svelte/store';

export async function handleFileOpen(event: CustomEvent<{ path: string; targetPanelId?: string }>) {
  const { path, targetPanelId } = event.detail;
  console.log('handleFileOpen called with:', { path, targetPanelId });
  
  // If no target panel specified, try to find an existing editor
  let targetPanel = targetPanelId ? 
    get(panelStore).panels.find(p => p.id === targetPanelId) : 
    null;
  
  // If target panel doesn't exist or is not suitable, create a new editor
  if (!targetPanel || !['editor', 'codeEditor', 'code-editor', 'preview', 'terminal', 'claude'].includes(targetPanel.type)) {
    // Always create a new code editor panel
    const fileName = path.split('/').pop() || 'Untitled';
    console.log('Creating new codeEditor panel for file:', fileName);
    panelStore.addPanel('codeEditor', {
      title: fileName,
      content: { filePath: path }
    });
    console.log('Panel added, current panels:', get(panelStore).panels);
    return;
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
  
  // Focus the target panel only if it exists
  if (targetPanel) {
    panelStore.setActivePanel(targetPanel.id);
  }
}