<script>
  import { Code, FileJson, Layers, Settings } from 'lucide-svelte';
  
  const apiCategories = [
    {
      icon: FileJson,
      title: 'File Operations',
      path: '/api/files',
      endpoints: [
        { method: 'GET', path: '/api/files/list', desc: 'List directory contents' },
        { method: 'POST', path: '/api/files/read', desc: 'Read file contents' },
        { method: 'POST', path: '/api/files/write', desc: 'Write to file' },
        { method: 'POST', path: '/api/files/create', desc: 'Create new file/folder' },
        { method: 'POST', path: '/api/files/rename', desc: 'Rename file/folder' },
        { method: 'DELETE', path: '/api/files/delete', desc: 'Delete file/folder' }
      ]
    },
    {
      icon: Layers,
      title: 'Panel Management',
      path: '/api/panels',
      endpoints: [
        { method: 'GET', path: '/api/panels/list', desc: 'List available panels' },
        { method: 'POST', path: '/api/panels/create', desc: 'Create new panel instance' },
        { method: 'GET', path: '/api/panels/layout', desc: 'Get current layout' },
        { method: 'POST', path: '/api/panels/save', desc: 'Save panel state' },
        { method: 'GET', path: '/api/panels/templates', desc: 'Get panel templates' }
      ]
    },
    {
      icon: Code,
      title: 'Custom Panels',
      path: '/api/custom-panels',
      endpoints: [
        { method: 'GET', path: '/api/custom-panels/list', desc: 'List custom panels' },
        { method: 'POST', path: '/api/custom-panels/create', desc: 'Create custom panel' },
        { method: 'POST', path: '/api/custom-panels/load', desc: 'Load panel component' },
        { method: 'GET', path: '/api/custom-panels/watch', desc: 'Watch for changes (SSE)' }
      ]
    },
    {
      icon: Settings,
      title: 'System',
      path: '/api/system',
      endpoints: [
        { method: 'WS', path: '/api/ws', desc: 'WebSocket connection' },
        { method: 'GET', path: '/api/sessions', desc: 'List terminal sessions' },
        { method: 'POST', path: '/api/auth/login', desc: 'Authenticate user' },
        { method: 'POST', path: '/api/log/browser', desc: 'Browser error logging' }
      ]
    }
  ];
</script>

<svelte:head>
  <title>API Reference - MorphBox Documentation</title>
</svelte:head>

<div class="api-overview">
  <div class="page-header">
    <Code size={32} />
    <h1>API Reference</h1>
  </div>

  <p class="intro">
    Complete reference for MorphBox's REST and WebSocket APIs. Use these endpoints to interact with the system programmatically.
  </p>

  <div class="base-info">
    <h2>Base URL</h2>
    <code class="base-url">http://localhost:3000</code>
    <p>All API endpoints are relative to this base URL. Replace with your MorphBox instance URL.</p>
  </div>

  <div class="auth-section">
    <h2>Authentication</h2>
    <p>Most endpoints require authentication. Include the session token in your requests:</p>
    <pre><code>{`// Header authentication
fetch('/api/files/list', {
  headers: {
    'Authorization': 'Bearer YOUR_SESSION_TOKEN'
  }
})

// Cookie authentication (automatic in browser)
fetch('/api/files/list', {
  credentials: 'include'
})`}</code></pre>
  </div>

  <div class="categories">
    {#each apiCategories as category}
      <div class="category-section">
        <div class="category-header">
          <svelte:component this={category.icon} size={24} />
          <h2>{category.title}</h2>
        </div>
        
        <div class="endpoints">
          {#each category.endpoints as endpoint}
            <div class="endpoint">
              <span class="method method-{endpoint.method.toLowerCase()}">{endpoint.method}</span>
              <code class="path">{endpoint.path}</code>
              <span class="desc">{endpoint.desc}</span>
            </div>
          {/each}
        </div>
      </div>
    {/each}
  </div>

  <div class="response-format">
    <h2>Response Format</h2>
    <p>All API responses follow a consistent format:</p>
    
    <h3>Success Response</h3>
    <pre><code>{`{
  "success": true,
  "data": {
    // Response data
  }
}`}</code></pre>

    <h3>Error Response</h3>
    <pre><code>{`{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": {} // Optional additional information
  }
}`}</code></pre>
  </div>

  <div class="websocket-section">
    <h2>WebSocket API</h2>
    <p>Connect to the WebSocket endpoint for real-time communication:</p>
    
    <pre><code>{`const ws = new WebSocket('ws://localhost:3000/api/ws');

ws.onopen = () => {
  console.log('Connected to MorphBox');
  
  // Send a message
  ws.send(JSON.stringify({
    type: 'TERMINAL_INPUT',
    payload: { 
      sessionId: 'abc123',
      input: 'ls -la\\n'
    }
  }));
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log('Received:', message);
};`}</code></pre>

    <h3>Message Types</h3>
    <div class="message-types">
      <div class="message-type">
        <h4>Terminal Messages</h4>
        <ul>
          <li><code>TERMINAL_INPUT</code> - Send input to terminal</li>
          <li><code>TERMINAL_OUTPUT</code> - Receive terminal output</li>
          <li><code>TERMINAL_RESIZE</code> - Resize terminal</li>
          <li><code>SESSION_CREATE</code> - Create new session</li>
          <li><code>SESSION_ATTACH</code> - Attach to existing session</li>
        </ul>
      </div>
      
      <div class="message-type">
        <h4>File System Events</h4>
        <ul>
          <li><code>FILE_CHANGED</code> - File modification notification</li>
          <li><code>FILE_CREATED</code> - New file created</li>
          <li><code>FILE_DELETED</code> - File deleted</li>
          <li><code>DIRECTORY_CHANGED</code> - Directory contents changed</li>
        </ul>
      </div>
      
      <div class="message-type">
        <h4>Panel Events</h4>
        <ul>
          <li><code>PANEL_UPDATE</code> - Panel state changed</li>
          <li><code>PANEL_MESSAGE</code> - Inter-panel communication</li>
          <li><code>LAYOUT_CHANGED</code> - Panel layout modified</li>
        </ul>
      </div>
    </div>
  </div>

  <div class="examples-section">
    <h2>Example Usage</h2>
    
    <h3>File Operations</h3>
    <pre><code>{`// List files in a directory
const response = await fetch('/api/files/list', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ path: '/home/user/projects' })
});

const { data } = await response.json();
console.log('Files:', data.files);

// Read a file
const fileResponse = await fetch('/api/files/read', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ path: '/home/user/file.txt' })
});

const { data: fileData } = await fileResponse.json();
console.log('Content:', fileData.content);`}</code></pre>

    <h3>Panel Management</h3>
    <pre><code>{`// Create a new terminal panel
const createResponse = await fetch('/api/panels/create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    type: 'terminal',
    title: 'New Terminal',
    position: { x: 0, y: 0, width: 50, height: 100 }
  })
});

const { data: panel } = await createResponse.json();
console.log('Created panel:', panel.id);`}</code></pre>
  </div>

  <div class="rate-limiting">
    <h2>Rate Limiting</h2>
    <p>API endpoints are rate-limited to prevent abuse:</p>
    <ul>
      <li>Standard endpoints: 100 requests per minute</li>
      <li>File write operations: 20 requests per minute</li>
      <li>WebSocket messages: 50 per second</li>
    </ul>
    <p>Rate limit information is included in response headers:</p>
    <pre><code>{`X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200`}</code></pre>
  </div>

  <div class="sdks">
    <h2>SDKs & Libraries</h2>
    <p>Official and community SDKs for easier integration:</p>
    
    <div class="sdk-grid">
      <div class="sdk-card">
        <h3>JavaScript/TypeScript</h3>
        <code>npm install @morphbox/sdk</code>
        <a href="https://github.com/morphbox/js-sdk">View on GitHub</a>
      </div>
      
      <div class="sdk-card">
        <h3>Python</h3>
        <code>pip install morphbox</code>
        <a href="https://github.com/morphbox/python-sdk">View on GitHub</a>
      </div>
      
      <div class="sdk-card">
        <h3>Go</h3>
        <code>go get github.com/morphbox/go-sdk</code>
        <a href="https://github.com/morphbox/go-sdk">View on GitHub</a>
      </div>
    </div>
  </div>
</div>

<style>
  .api-overview {
    padding: 2rem;
    max-width: 1200px;
    margin: 0 auto;
  }

  .page-header {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 2rem;
  }

  .page-header h1 {
    margin: 0;
  }

  .intro {
    font-size: 1.1rem;
    color: var(--text-secondary);
    margin-bottom: 3rem;
  }

  .base-info {
    background: var(--surface-secondary);
    border-radius: 8px;
    padding: 1.5rem;
    margin-bottom: 2rem;
  }

  .base-info h2 {
    margin: 0 0 0.5rem 0;
  }

  .base-url {
    display: inline-block;
    padding: 0.5rem 1rem;
    background: var(--surface-primary);
    border: 1px solid var(--border);
    border-radius: 4px;
    font-size: 1.1rem;
    margin: 0.5rem 0;
  }

  .auth-section {
    margin-bottom: 3rem;
  }

  pre {
    background: var(--surface-primary);
    border: 1px solid var(--border);
    border-radius: 4px;
    padding: 1rem;
    overflow-x: auto;
    margin: 1rem 0;
  }

  code {
    font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
  }

  .categories {
    margin-bottom: 3rem;
  }

  .category-section {
    background: var(--surface-secondary);
    border-radius: 8px;
    padding: 1.5rem;
    margin-bottom: 1.5rem;
  }

  .category-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 1rem;
  }

  .category-header h2 {
    margin: 0;
  }

  .endpoints {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .endpoint {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.5rem 0;
    border-bottom: 1px solid var(--border);
  }

  .endpoint:last-child {
    border-bottom: none;
  }

  .method {
    font-weight: 600;
    font-size: 0.85rem;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    min-width: 50px;
    text-align: center;
  }

  .method-get {
    background: #4CAF50;
    color: white;
  }

  .method-post {
    background: #2196F3;
    color: white;
  }

  .method-delete {
    background: #f44336;
    color: white;
  }

  .method-ws {
    background: #9C27B0;
    color: white;
  }

  .path {
    flex: 1;
    font-size: 0.9rem;
  }

  .desc {
    color: var(--text-secondary);
    font-size: 0.9rem;
  }

  .response-format {
    margin-bottom: 3rem;
  }

  .response-format h3 {
    margin: 1.5rem 0 0.5rem 0;
  }

  .websocket-section {
    margin-bottom: 3rem;
  }

  .message-types {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1.5rem;
    margin-top: 1.5rem;
  }

  .message-type {
    background: var(--surface-secondary);
    border-radius: 8px;
    padding: 1rem;
  }

  .message-type h4 {
    margin: 0 0 0.75rem 0;
  }

  .message-type ul {
    margin: 0;
    padding-left: 1.5rem;
  }

  .message-type li {
    margin-bottom: 0.25rem;
    font-size: 0.9rem;
  }

  .examples-section h3 {
    margin: 2rem 0 0.5rem 0;
  }

  .rate-limiting {
    background: var(--surface-secondary);
    border-radius: 8px;
    padding: 1.5rem;
    margin-bottom: 3rem;
  }

  .rate-limiting h2 {
    margin: 0 0 1rem 0;
  }

  .rate-limiting ul {
    margin: 1rem 0;
    padding-left: 1.5rem;
  }

  .sdks {
    margin-bottom: 3rem;
  }

  .sdk-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1rem;
    margin-top: 1rem;
  }

  .sdk-card {
    background: var(--surface-secondary);
    border-radius: 8px;
    padding: 1.5rem;
    text-align: center;
  }

  .sdk-card h3 {
    margin: 0 0 0.75rem 0;
  }

  .sdk-card code {
    display: block;
    padding: 0.5rem;
    background: var(--surface-primary);
    border: 1px solid var(--border);
    border-radius: 4px;
    margin: 0.75rem 0;
    font-size: 0.85rem;
  }

  .sdk-card a {
    color: var(--primary);
    text-decoration: none;
    font-size: 0.9rem;
  }

  .sdk-card a:hover {
    text-decoration: underline;
  }

  @media (max-width: 768px) {
    .api-overview {
      padding: 1rem;
    }

    .endpoint {
      flex-wrap: wrap;
    }

    .path {
      width: 100%;
      order: 2;
      margin-top: 0.25rem;
    }
  }
</style>