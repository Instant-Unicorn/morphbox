<script>
  import FileExplorer from '$lib/panels/FileExplorer/FileExplorer.svelte';
  import CodeEditor from '$lib/panels/CodeEditor/CodeEditor.svelte';
  import BasePanel from '$lib/panels/BasePanel.svelte';
  
  let showFileExplorer = true;
  let showCodeEditor = false;
  
  // Panel states
  let fileExplorerState = {
    x: 50,
    y: 100,
    width: 400,
    height: 500,
    zIndex: 10,
    isMinimized: false,
    isMaximized: false
  };
  
  let codeEditorState = {
    x: 500,
    y: 100,
    width: 600,
    height: 500,
    zIndex: 10,
    isMinimized: false,
    isMaximized: false
  };
</script>

<div style="height: 100vh; width: 100vw; position: relative; background: #1e1e1e;">
  <h1 style="color: white; padding: 20px;">Panel Test Page</h1>
  
  <button on:click={() => showFileExplorer = !showFileExplorer}>
    Toggle FileExplorer
  </button>
  
  <button on:click={() => showCodeEditor = !showCodeEditor}>
    Toggle CodeEditor
  </button>
  
  <button on:click={() => { localStorage.clear(); location.reload(); }} style="background: #d73a49;">
    Clear All Panels & Reload
  </button>
  
  {#if showFileExplorer}
    <BasePanel
      config={{
        title: 'File Explorer Test',
        movable: true,
        resizable: true,
        closable: true,
        minimizable: true,
        maximizable: true,
        minWidth: 300,
        minHeight: 200
      }}
      state={fileExplorerState}
      onClose={() => showFileExplorer = false}
      onMove={(x, y) => fileExplorerState = { ...fileExplorerState, x, y }}
      onResize={(width, height) => fileExplorerState = { ...fileExplorerState, width, height }}
      onFocus={() => fileExplorerState = { ...fileExplorerState, zIndex: 20 }}
    >
      <FileExplorer />
    </BasePanel>
  {/if}
  
  {#if showCodeEditor}
    <BasePanel
      config={{
        title: 'Code Editor Test',
        movable: true,
        resizable: true,
        closable: true,
        minimizable: true,
        maximizable: true,
        minWidth: 300,
        minHeight: 200
      }}
      state={codeEditorState}
      onClose={() => showCodeEditor = false}
      onMove={(x, y) => codeEditorState = { ...codeEditorState, x, y }}
      onResize={(width, height) => codeEditorState = { ...codeEditorState, width, height }}
      onFocus={() => codeEditorState = { ...codeEditorState, zIndex: 20 }}
    >
      <CodeEditor />
    </BasePanel>
  {/if}
</div>

<style>
  button {
    margin: 10px;
    padding: 10px 20px;
    background: #0e639c;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }
  
  button:hover {
    background: #1177bb;
  }
</style>