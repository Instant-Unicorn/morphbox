<script>
  const templates = [
    { name: 'basic', description: 'Simple panel with data display' },
    { name: 'api', description: 'Panel that fetches data from APIs' },
    { name: 'chart', description: 'Data visualization panel' },
    { name: 'form', description: 'Interactive form panel' }
  ];
</script>

<svelte:head>
  <title>Custom Panels - MorphBox Documentation</title>
</svelte:head>

<div class="docs-content">
  <h1>Custom Panels</h1>
  
  <p>Create your own panels to extend MorphBox functionality. Panels are single-file Svelte components stored in ~/morphbox/panels/ and loaded automatically.</p>
  
  <h2>Quick Start</h2>
  
  <p>Use the Panel Manager to create custom panels directly in the MorphBox interface.</p>
  
  <h2>Available Templates</h2>
  
  {#each templates as template}
    <div class="template">
      <h3>{template.name}</h3>
      <p>{template.description}</p>
    </div>
  {/each}
</div>

<style>
  .docs-content {
    padding: 2rem;
    max-width: 800px;
    margin: 0 auto;
  }
  
  .template {
    margin: 1rem 0;
    padding: 1rem;
    border: 1px solid var(--border-color);
    border-radius: 4px;
  }
  
  h1, h2, h3 {
    color: var(--text-primary);
  }
  
  p {
    color: var(--text-secondary);
  }
</style>