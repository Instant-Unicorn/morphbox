<script>
  import CodeEditor from '$lib/panels/CodeEditor/CodeEditor.svelte';
  import { onMount } from 'svelte';
  
  let editor;
  let containerInfo = { width: 0, height: 0 };
  let viewportInfo = { width: 0, height: 0 };
  
  onMount(() => {
    // Test file
    editor?.openFile('test.js', 'console.log("Hello, mobile!");', 'javascript');
    
    // Update info
    function updateInfo() {
      viewportInfo = {
        width: window.innerWidth,
        height: window.innerHeight
      };
      
      const container = document.querySelector('.test-container');
      if (container) {
        const rect = container.getBoundingClientRect();
        containerInfo = {
          width: rect.width,
          height: rect.height
        };
      }
    }
    
    updateInfo();
    window.addEventListener('resize', updateInfo);
    window.addEventListener('orientationchange', updateInfo);
    
    return () => {
      window.removeEventListener('resize', updateInfo);
      window.removeEventListener('orientationchange', updateInfo);
    };
  });
</script>

<div class="mobile-test-page">
  <div class="info-bar">
    <div>Viewport: {viewportInfo.width}x{viewportInfo.height}</div>
    <div>Container: {containerInfo.width}x{containerInfo.height}</div>
  </div>
  
  <div class="test-container">
    <CodeEditor bind:this={editor} />
  </div>
</div>

<style>
  .mobile-test-page {
    display: flex;
    flex-direction: column;
    height: 100vh;
    width: 100vw;
    overflow: hidden;
    background: #1e1e1e;
  }
  
  .info-bar {
    display: flex;
    justify-content: space-around;
    padding: 8px;
    background: #333;
    color: white;
    font-size: 12px;
    flex-shrink: 0;
  }
  
  .test-container {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    padding: 10px;
  }
  
  .test-container :global(.code-editor) {
    flex: 1;
    min-height: 0;
  }
</style>