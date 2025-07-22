<script>
  import { onMount } from 'svelte';
  
  let messages = [];
  let container;
  
  onMount(() => {
    addMessage('Component mounted');
    
    // Check container immediately
    addMessage(`Container exists: ${!!container}`);
    
    // Check after frame
    requestAnimationFrame(() => {
      addMessage(`Container after frame: ${!!container}`);
      if (container) {
        const rect = container.getBoundingClientRect();
        addMessage(`Container size: ${rect.width}x${rect.height}`);
      }
    });
    
    // Check after timeout
    setTimeout(() => {
      addMessage(`Container after 100ms: ${!!container}`);
      if (container) {
        const rect = container.getBoundingClientRect();
        addMessage(`Container size: ${rect.width}x${rect.height}`);
      }
    }, 100);
  });
  
  function addMessage(msg) {
    messages = [...messages, `${new Date().toISOString()}: ${msg}`];
  }
</script>

<h1>Terminal Container Test</h1>

<div bind:this={container} style="width: 100%; height: 200px; border: 1px solid red; background: #f0f0f0;">
  Test Container
</div>

<h2>Debug Messages:</h2>
<pre>{messages.join('\n')}</pre>