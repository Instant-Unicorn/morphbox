<script lang="ts">
  import RowPanel from '$lib/components/RowPanel.svelte';
  import type { Panel } from '$lib/stores/panels';
  
  // Create a test panel
  const testPanel: Panel = {
    id: 'test-panel-1',
    type: 'test',
    title: 'Color Picker Test Panel',
    content: {},
    rowIndex: 0,
    orderInRow: 0,
    persistent: false,
    headerColor: '#636363',
    backgroundColor: '#2a2a2a',
    borderColor: '#444'
  };
  
  // Simple test component
  const TestComponent = {
    $$prop_def: {},
    $$events_def: {},
    $$slot_def: {}
  };
</script>

<div class="test-container">
  <h1>Color Picker Test</h1>
  <p>Click the palette icon in the panel header to test the color picker popup.</p>
  
  <div class="panel-wrapper">
    <RowPanel 
      panel={testPanel} 
      component={TestComponent}
      websocketUrl=""
    />
  </div>
</div>

<style>
  .test-container {
    padding: 20px;
    height: 100vh;
    background: #1e1e1e;
    color: #ccc;
  }
  
  .panel-wrapper {
    width: 600px;
    height: 400px;
    margin: 20px auto;
    position: relative;
  }
</style>