<script lang="ts">
  import { SplitPane, PanelContainer } from './index';
  
  // Example: Simple two-pane layout
  let editorSplit = 60;
</script>

<!-- Example 1: Basic horizontal split -->
<div class="example" style="height: 400px;">
  <SplitPane orientation="horizontal" split={editorSplit} minSize={200}>
    <div slot="pane1">
      <PanelContainer title="Editor">
        <pre><code>// Your code editor here
function hello() {
  console.log("Hello, MorphBox!");
}</code></pre>
      </PanelContainer>
    </div>
    
    <div slot="pane2">
      <PanelContainer title="Terminal" collapsible={true}>
        <div style="font-family: monospace; padding: 10px;">
          $ npm run dev<br/>
          Server running at http://localhost:5173
        </div>
      </PanelContainer>
    </div>
  </SplitPane>
</div>

<!-- Example 2: Complex nested layout -->
<div class="example" style="height: 600px; margin-top: 20px;">
  <SplitPane orientation="horizontal" split={25} minSize={150}>
    <!-- Sidebar -->
    <div slot="pane1">
      <PanelContainer title="File Explorer">
        <ul style="list-style: none; padding: 0;">
          <li>📁 src/</li>
          <li style="padding-left: 20px;">📄 main.ts</li>
          <li style="padding-left: 20px;">📄 app.svelte</li>
          <li>📁 public/</li>
          <li>📄 package.json</li>
        </ul>
      </PanelContainer>
    </div>
    
    <!-- Main area with vertical split -->
    <div slot="pane2">
      <SplitPane orientation="vertical" split={70} minSize={100}>
        <div slot="pane1">
          <PanelContainer title="Main Content">
            <h3>Welcome to MorphBox</h3>
            <p>This is the main content area.</p>
          </PanelContainer>
        </div>
        
        <div slot="pane2">
          <PanelContainer title="Output" closable={true}>
            <div style="font-family: monospace; font-size: 12px;">
              [2024-01-15 10:00:00] Application started<br/>
              [2024-01-15 10:00:01] Connected to server<br/>
              [2024-01-15 10:00:02] Ready
            </div>
          </PanelContainer>
        </div>
      </SplitPane>
    </div>
  </SplitPane>
</div>

<style>
  .example {
    border: 1px solid #ddd;
    border-radius: 8px;
    overflow: hidden;
  }
  
  pre {
    margin: 0;
    padding: 10px;
    background: #f5f5f5;
    border-radius: 4px;
  }
  
  ul li {
    padding: 4px 8px;
    cursor: pointer;
  }
  
  ul li:hover {
    background: #e0e0e0;
  }
</style>