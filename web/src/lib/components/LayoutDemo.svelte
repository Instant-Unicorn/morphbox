<script lang="ts">
  import SplitPane from './SplitPane.svelte';
  import PanelContainer from './PanelContainer.svelte';
  
  let mainSplit = 70;
  let sidebarSplit = 50;
  let showRightPanel = true;
  let bottomPanelCollapsed = false;
  
  function handleMainSplitChange(event: CustomEvent) {
    console.log('Main split changed:', event.detail);
  }
  
  function handleCloseRight() {
    showRightPanel = false;
  }
</script>

<div class="layout-demo">
  <h1>Layout System Demo</h1>
  
  <div class="demo-container">
    <SplitPane
      orientation="horizontal"
      split={mainSplit}
      minSize={200}
      on:splitchange={handleMainSplitChange}
    >
      <div slot="pane1" class="left-section">
        <SplitPane
          orientation="vertical"
          split={sidebarSplit}
          minSize={150}
        >
          <PanelContainer 
            slot="pane1"
            title="Top Panel"
            collapsible={true}
          >
            <div class="demo-content">
              <h3>Collapsible Panel</h3>
              <p>This panel can be collapsed by clicking the chevron or the header.</p>
              <p>Try dragging the resize handles to adjust the layout!</p>
            </div>
          </PanelContainer>
          
          <PanelContainer 
            slot="pane2"
            title="Bottom Panel"
            collapsible={true}
            bind:collapsed={bottomPanelCollapsed}
          >
            <div slot="header-actions">
              <button class="action-button">
                Settings
              </button>
            </div>
            <div class="demo-content">
              <h3>Panel with Actions</h3>
              <p>This panel has custom header actions.</p>
              <p>Current state: {bottomPanelCollapsed ? 'Collapsed' : 'Expanded'}</p>
            </div>
          </PanelContainer>
        </SplitPane>
      </div>
      
<div slot="pane2" class="right-section">
        {#if showRightPanel}
          <PanelContainer
            title="Right Panel"
            closable={true}
            on:close={handleCloseRight}
            className="right-panel"
          >
            <div class="demo-content">
              <h3>Closable Panel</h3>
              <p>This panel can be closed using the X button.</p>
              <p>Split position: {mainSplit.toFixed(1)}%</p>
              
              <div class="nested-demo">
                <h4>Nested Split Pane</h4>
                <div class="nested-container">
                  <SplitPane
                    orientation="vertical"
                    split={60}
                    minSize={50}
                  >
                    <div slot="pane1" class="nested-pane">
                      <p>Nested Top</p>
                    </div>
                    <div slot="pane2" class="nested-pane">
                      <p>Nested Bottom</p>
                    </div>
                  </SplitPane>
                </div>
              </div>
            </div>
          </PanelContainer>
        {:else}
          <div class="closed-message">
            <p>Right panel is closed</p>
            <button on:click={() => showRightPanel = true}>
              Reopen Panel
            </button>
          </div>
        {/if}
      </div>
    </SplitPane>
  </div>
  
  <div class="controls">
    <h3>Controls</h3>
    <label>
      Main Split: {mainSplit.toFixed(1)}%
      <input 
        type="range" 
        min="20" 
        max="80" 
        bind:value={mainSplit}
      />
    </label>
    <label>
      Sidebar Split: {sidebarSplit.toFixed(1)}%
      <input 
        type="range" 
        min="20" 
        max="80" 
        bind:value={sidebarSplit}
      />
    </label>
  </div>
</div>

<style>
  .layout-demo {
    height: 100vh;
    display: flex;
    flex-direction: column;
    padding: 20px;
    background: #f0f0f0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }
  
  h1 {
    margin: 0 0 20px 0;
    color: #333;
  }
  
  .demo-container {
    flex: 1;
    border: 1px solid #ccc;
    border-radius: 8px;
    overflow: hidden;
    background: white;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }
  
  .left-section {
    height: 100%;
    background: #fafafa;
  }
  
  .demo-content {
    padding: 20px;
  }
  
  .demo-content h3 {
    margin-top: 0;
    color: #555;
  }
  
  .demo-content p {
    color: #666;
    line-height: 1.6;
  }
  
  .nested-demo {
    margin-top: 20px;
  }
  
  .nested-container {
    height: 200px;
    border: 1px solid #ddd;
    border-radius: 4px;
    overflow: hidden;
  }
  
  .nested-pane {
    padding: 20px;
    background: #f5f5f5;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .closed-message {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    gap: 20px;
    color: #666;
  }
  
  .closed-message button {
    padding: 8px 16px;
    background: #2196F3;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
  }
  
  .closed-message button:hover {
    background: #1976D2;
  }
  
  .action-button {
    padding: 4px 12px;
    background: transparent;
    border: 1px solid #ddd;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
    color: #666;
  }
  
  .action-button:hover {
    background: #f0f0f0;
    color: #333;
  }
  
  .controls {
    margin-top: 20px;
    padding: 20px;
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
  
  .controls h3 {
    margin-top: 0;
    color: #333;
  }
  
  .controls label {
    display: block;
    margin-bottom: 15px;
    color: #555;
  }
  
  .controls input[type="range"] {
    display: block;
    width: 100%;
    margin-top: 5px;
  }
  
  /* Custom theme variables */
  :global(:root) {
    --drag-handle-size: 6px;
    --drag-handle-bg: #e0e0e0;
    --drag-handle-hover-bg: #bdbdbd;
    --drag-handle-active-bg: #2196F3;
    --drag-handle-grip-color: #999;
    
    --panel-bg: white;
    --panel-border: #e0e0e0;
    --panel-radius: 6px;
    --panel-header-bg: #f8f8f8;
    --panel-header-height: 40px;
    --panel-header-padding: 8px 16px;
    --panel-title-size: 14px;
    --panel-content-padding: 16px;
    
    --scrollbar-track: #f1f1f1;
    --scrollbar-thumb: #c1c1c1;
    --scrollbar-thumb-hover: #a8a8a8;
  }
  
  :global(.right-panel) {
    --panel-header-bg: #e3f2fd;
    --panel-title-color: #1976D2;
  }
</style>