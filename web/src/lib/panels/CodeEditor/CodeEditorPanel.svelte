<script lang="ts">
  import CodeEditor from './CodeEditor.svelte';
  import type { SaveEvent, ChangeEvent } from './types';
  
  export let panelConfig: any = {};
  
  let editor: CodeEditor;
  
  // Example: Load initial files from panel config
  $: if (editor && panelConfig.initialFiles) {
    panelConfig.initialFiles.forEach((file: any) => {
      editor.openFile(file.name, file.content, file.language);
    });
  }
  
  async function handleSave(event: CustomEvent<SaveEvent>) {
    const { fileName, content } = event.detail;
    
    try {
      // Save to server
      const response = await fetch('/api/files/write', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          path: fileName,
          content: content
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to save file');
      }
      
      console.log(`File saved: ${fileName}`);
    } catch (error) {
      console.error('Error saving file:', error);
      alert(`Failed to save ${fileName}`);
    }
  }
  
  function handleChange(event: CustomEvent<ChangeEvent>) {
    // You can implement auto-save or other features here
    console.log('File changed:', event.detail.fileName);
  }
  
  // Public API for panel integration
  export function openFile(fileName: string, content: string, language?: string) {
    editor?.openFile(fileName, content, language);
  }
  
  export function saveCurrentFile() {
    editor?.saveCurrentFile();
  }
  
  export function getCurrentContent() {
    return editor?.getCurrentContent();
  }
</script>

<div class="code-editor-panel">
  <CodeEditor
    bind:this={editor}
    theme={panelConfig.theme || 'vs-dark'}
    fontSize={panelConfig.fontSize || 14}
    minimap={panelConfig.minimap !== false}
    lineNumbers={panelConfig.lineNumbers !== false}
    wordWrap={panelConfig.wordWrap || false}
    autoSave={panelConfig.autoSave || false}
    autoSaveDelay={panelConfig.autoSaveDelay || 1000}
    on:save={handleSave}
    on:change={handleChange}
  />
</div>

<style>
  .code-editor-panel {
    height: 100%;
    width: 100%;
    display: flex;
    flex-direction: column;
  }
</style>