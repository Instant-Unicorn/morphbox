<script lang="ts">
  import CodeEditor from './CodeEditor.svelte';
  import type { SaveEvent, ChangeEvent, EditorTheme } from './types';

  let editor: CodeEditor;
  
  // Example files to demonstrate functionality
  const exampleFiles = [
    {
      name: 'example.js',
      content: `// JavaScript Example
function greet(name) {
  console.log(\`Hello, \${name}!\`);
}

// Call the function
greet('World');

// Array operations
const numbers = [1, 2, 3, 4, 5];
const doubled = numbers.map(n => n * 2);
console.log(doubled);`
    },
    {
      name: 'styles.css',
      content: `/* CSS Example */
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  margin: 0;
  padding: 0;
  background-color: #f5f5f5;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.button {
  background-color: #007bff;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
}

.button:hover {
  background-color: #0056b3;
}`
    },
    {
      name: 'component.svelte',
      content: `<script>
  import { onMount } from 'svelte';
  
  let count = 0;
  let message = 'Hello Svelte!';
  
  function increment() {
    count += 1;
  }
  
  onMount(() => {
    console.log('Component mounted');
  });
<\/script>

<div class="counter">
  <h1>{message}</h1>
  <p>Count: {count}</p>
  <button on:click={increment}>
    Increment
  </button>
</div>

<style>
  .counter {
    text-align: center;
    padding: 2rem;
  }
  
  button {
    background-color: #ff3e00;
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 4px;
    cursor: pointer;
  }
  
  button:hover {
    background-color: #ff5722;
  }
</style>`
    },
    {
      name: 'data.json',
      content: `{
  "name": "Code Editor Example",
  "version": "1.0.0",
  "description": "A powerful code editor built with Monaco Editor",
  "features": [
    "Syntax highlighting",
    "Multiple tabs",
    "Auto-save",
    "Find and replace",
    "Theme support"
  ],
  "settings": {
    "theme": "vs-dark",
    "fontSize": 14,
    "autoSave": true,
    "minimap": true
  }
}`
    }
  ];

  // Editor settings
  let theme: EditorTheme = 'vs-dark';
  let fontSize = 14;
  let minimap = true;
  let lineNumbers = true;
  let wordWrap = false;
  let autoSave = false;

  function loadExampleFiles() {
    exampleFiles.forEach(file => {
      editor.openFile(file.name, file.content);
    });
  }

  function handleSave(event: CustomEvent<SaveEvent>) {
    console.log('File saved:', event.detail.fileName);
    // Here you would typically send the file content to your backend
  }

  function handleChange(event: CustomEvent<ChangeEvent>) {
    console.log('File changed:', event.detail.fileName);
  }

  function createNewFile() {
    const fileName = prompt('Enter file name:');
    if (fileName) {
      editor.openFile(fileName, '// Start coding...\n');
    }
  }

  function saveAllFiles() {
    editor.saveCurrentFile();
  }
</script>

<div class="editor-demo">
  <div class="toolbar">
    <div class="toolbar-section">
      <button on:click={createNewFile}>New File</button>
      <button on:click={loadExampleFiles}>Load Examples</button>
      <button on:click={saveAllFiles}>Save (Ctrl+S)</button>
      <button on:click={() => editor.openFindReplace()}>Find (Ctrl+F)</button>
    </div>
    
    <div class="toolbar-section">
      <label>
        Theme:
        <select bind:value={theme}>
          <option value="vs">Light</option>
          <option value="vs-dark">Dark</option>
          <option value="hc-black">High Contrast</option>
        </select>
      </label>
      
      <label>
        Font Size:
        <input type="number" bind:value={fontSize} min="10" max="24" />
      </label>
      
      <label>
        <input type="checkbox" bind:checked={minimap} />
        Minimap
      </label>
      
      <label>
        <input type="checkbox" bind:checked={lineNumbers} />
        Line Numbers
      </label>
      
      <label>
        <input type="checkbox" bind:checked={wordWrap} />
        Word Wrap
      </label>
      
      <label>
        <input type="checkbox" bind:checked={autoSave} />
        Auto Save
      </label>
    </div>
  </div>
  
  <div class="editor-wrapper">
    <CodeEditor
      bind:this={editor}
      {theme}
      {fontSize}
      {minimap}
      {lineNumbers}
      {wordWrap}
      {autoSave}
      on:save={handleSave}
      on:change={handleChange}
    />
  </div>
</div>

<style>
  .editor-demo {
    display: flex;
    flex-direction: column;
    height: 100vh;
    background-color: #1e1e1e;
  }

  .toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 20px;
    background-color: #2d2d2d;
    border-bottom: 1px solid #3e3e3e;
    flex-wrap: wrap;
    gap: 10px;
  }

  .toolbar-section {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }

  .toolbar button {
    padding: 6px 12px;
    background-color: #0e639c;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 13px;
    transition: background-color 0.2s;
  }

  .toolbar button:hover {
    background-color: #1177bb;
  }

  .toolbar label {
    display: flex;
    align-items: center;
    gap: 5px;
    color: #cccccc;
    font-size: 13px;
  }

  .toolbar select,
  .toolbar input[type="number"] {
    padding: 4px 8px;
    background-color: #3c3c3c;
    color: #cccccc;
    border: 1px solid #3e3e3e;
    border-radius: 4px;
    font-size: 13px;
  }

  .toolbar input[type="checkbox"] {
    margin: 0;
  }

  .editor-wrapper {
    flex: 1;
    overflow: hidden;
  }
</style>