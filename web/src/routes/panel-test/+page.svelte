<script lang="ts">
  import { onMount } from 'svelte';
  import FileExplorer from '$lib/panels/FileExplorer/FileExplorer.svelte';
  import CodeEditor from '$lib/panels/CodeEditor/CodeEditor.svelte';
  
  let showFileExplorer = true;
  let showCodeEditor = true;
  let codeEditor: CodeEditor;
  
  onMount(() => {
    console.log('Panel test page mounted');
    
    // Test opening a file in the code editor
    setTimeout(() => {
      if (codeEditor) {
        codeEditor.openFile('test.js', '// Test file\nconsole.log("Hello, World!");');
      }
    }, 1000);
  });
  
  function handleFileSelect(event: CustomEvent<{ path: string }>) {
    console.log('File selected:', event.detail.path);
  }
  
  function handleFileOpen(event: CustomEvent<{ path: string }>) {
    console.log('File opened:', event.detail.path);
    if (codeEditor) {
      codeEditor.openFile(event.detail.path, `// Contents of ${event.detail.path}\n// This is mock content`);
    }
  }
</script>

<div class="test-container">
  <h1>Panel Test Page</h1>
  
  <div class="controls">
    <label>
      <input type="checkbox" bind:checked={showFileExplorer} />
      Show File Explorer
    </label>
    <label>
      <input type="checkbox" bind:checked={showCodeEditor} />
      Show Code Editor
    </label>
  </div>
  
  <div class="panels">
    {#if showFileExplorer}
      <div class="panel-wrapper file-explorer-wrapper">
        <h2>File Explorer Panel</h2>
        <div class="panel-content-wrapper">
          <FileExplorer 
            rootPath="/workspace"
            on:select={handleFileSelect}
            on:open={handleFileOpen}
          />
        </div>
      </div>
    {/if}
    
    {#if showCodeEditor}
      <div class="panel-wrapper code-editor-wrapper">
        <h2>Code Editor Panel</h2>
        <div class="panel-content-wrapper">
          <CodeEditor 
            bind:this={codeEditor}
            theme="vs-dark"
            fontSize={14}
          />
        </div>
      </div>
    {/if}
  </div>
  
  <div class="console-output">
    <h3>Console Output</h3>
    <p>Check the browser console for any errors.</p>
  </div>
</div>

<style>
  .test-container {
    height: 100vh;
    display: flex;
    flex-direction: column;
    background-color: #1e1e1e;
    color: #cccccc;
    padding: 20px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }
  
  h1, h2, h3 {
    margin: 0 0 10px 0;
  }
  
  .controls {
    display: flex;
    gap: 20px;
    margin-bottom: 20px;
  }
  
  .controls label {
    display: flex;
    align-items: center;
    gap: 5px;
  }
  
  .panels {
    flex: 1;
    display: flex;
    gap: 20px;
    min-height: 0;
  }
  
  .panel-wrapper {
    flex: 1;
    display: flex;
    flex-direction: column;
    border: 1px solid #3e3e42;
    border-radius: 4px;
    overflow: hidden;
    background-color: #252526;
  }
  
  .panel-wrapper h2 {
    padding: 10px;
    background-color: #2d2d30;
    border-bottom: 1px solid #3e3e42;
    font-size: 14px;
    font-weight: 600;
  }
  
  .panel-content-wrapper {
    flex: 1;
    overflow: hidden;
    position: relative;
    min-height: 0;
    /* Explicit height to ensure child components can use 100% height */
    height: 100%;
  }
  
  .console-output {
    margin-top: 20px;
    padding: 10px;
    background-color: #2d2d30;
    border: 1px solid #3e3e42;
    border-radius: 4px;
  }
  
  .console-output h3 {
    font-size: 14px;
    margin-bottom: 5px;
  }
  
  .console-output p {
    margin: 0;
    font-size: 12px;
    color: #9cdcfe;
  }
</style>