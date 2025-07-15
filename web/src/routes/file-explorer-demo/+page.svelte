<script lang="ts">
  import FileExplorer from '$lib/panels/FileExplorer/FileExplorer.svelte';
  
  let selectedFile: string | null = null;
  
  function handleFileSelect(event: CustomEvent<{ path: string }>) {
    selectedFile = event.detail.path;
  }
  
  function handleFileOpen(event: CustomEvent<{ path: string }>) {
    alert(`Opening file: ${event.detail.path}`);
  }
</script>

<div class="demo-container">
  <div class="explorer-panel">
    <FileExplorer 
      rootPath="/workspace"
      {selectedFile}
      on:select={handleFileSelect}
      on:open={handleFileOpen}
    />
  </div>
  
  <div class="info-panel">
    <h2>File Explorer Demo</h2>
    <p>Selected file: {selectedFile || 'None'}</p>
    
    <h3>Features:</h3>
    <ul>
      <li>Click to select files</li>
      <li>Double-click to open files</li>
      <li>Right-click for context menu</li>
      <li>Create new files and folders</li>
      <li>Rename items (right-click → Rename)</li>
      <li>Delete items (right-click → Delete)</li>
      <li>Expand/collapse directories</li>
      <li>File icons based on extension</li>
    </ul>
    
    <p><strong>Note:</strong> This is a demo with mock data. In production, it will connect to the WebSocket server for real file operations.</p>
  </div>
</div>

<style>
  .demo-container {
    display: flex;
    height: 100vh;
    background-color: #1e1e1e;
    color: #d4d4d4;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }
  
  .explorer-panel {
    width: 300px;
    height: 100%;
    border-right: 1px solid #3e3e42;
  }
  
  .info-panel {
    flex: 1;
    padding: 20px;
    overflow-y: auto;
  }
  
  .info-panel h2 {
    margin-top: 0;
    color: #cccccc;
  }
  
  .info-panel h3 {
    color: #cccccc;
    margin-top: 20px;
  }
  
  .info-panel ul {
    line-height: 1.8;
  }
  
  .info-panel li {
    color: #9cdcfe;
  }
  
  .info-panel p {
    line-height: 1.6;
  }
</style>