# Code Editor Panel

A powerful code editor component built with Monaco Editor for the MorphBox project.

## Features

- **Syntax Highlighting**: Support for 40+ programming languages
- **Multiple Tabs**: Open and edit multiple files simultaneously
- **Auto-Save**: Optional automatic saving with configurable delay
- **Search & Replace**: Built-in find and replace functionality (Ctrl+F)
- **Keyboard Shortcuts**: 
  - Save: Ctrl+S (Cmd+S on Mac)
  - Find: Ctrl+F (Cmd+F on Mac)
- **Line Numbers**: Toggle line numbers display
- **Minimap**: Visual code overview
- **Theme Support**: Light, Dark, and High Contrast themes
- **Word Wrap**: Toggle word wrapping
- **Dirty State Tracking**: Visual indicator for unsaved changes

## Usage

### Basic Example

```svelte
<script>
  import { CodeEditor } from '$lib/panels/CodeEditor';
  
  let editor;
  
  function handleSave(event) {
    console.log('Saved:', event.detail.fileName, event.detail.content);
  }
</script>

<CodeEditor
  bind:this={editor}
  theme="vs-dark"
  fontSize={14}
  on:save={handleSave}
/>
```

### Opening Files

```javascript
// Open a single file
editor.openFile('example.js', 'console.log("Hello World");');

// Open with specific language
editor.openFile('example.txt', 'Plain text content', 'plaintext');
```

### Configuration Options

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `theme` | `'vs' \| 'vs-dark' \| 'hc-black'` | `'vs-dark'` | Editor theme |
| `fontSize` | `number` | `14` | Font size in pixels |
| `minimap` | `boolean` | `true` | Show/hide minimap |
| `lineNumbers` | `boolean` | `true` | Show/hide line numbers |
| `wordWrap` | `boolean` | `false` | Enable word wrapping |
| `autoSave` | `boolean` | `false` | Enable auto-save |
| `autoSaveDelay` | `number` | `1000` | Auto-save delay in ms |

### Events

| Event | Detail | Description |
|-------|--------|-------------|
| `save` | `{ fileName: string, content: string }` | Fired when file is saved |
| `change` | `{ fileName: string, content: string }` | Fired on content change |
| `tabClosed` | `{ tabId: string, fileName: string }` | Fired when tab is closed |
| `ready` | `{ editor: IStandaloneCodeEditor, monaco: any }` | Fired when editor is ready |
| `error` | `{ error: Error }` | Fired on initialization error |

### Methods

```javascript
// Open a file
editor.openFile(fileName, content, language?);

// Close a tab
editor.closeTab(tabId);

// Save current file
editor.saveCurrentFile();

// Get current content
const content = editor.getCurrentContent();

// Open find/replace dialog
editor.openFindReplace();
```

## Supported Languages

The editor automatically detects language from file extensions:

- JavaScript/TypeScript: `.js`, `.ts`, `.jsx`, `.tsx`
- Web: `.html`, `.css`, `.scss`, `.sass`, `.less`
- Data: `.json`, `.xml`, `.yaml`, `.yml`, `.toml`
- Python: `.py`
- Java: `.java`
- C/C++: `.c`, `.cpp`
- Go: `.go`
- Rust: `.rs`
- And many more...

## Example Implementation

See `CodeEditorExample.svelte` for a complete implementation example with toolbar and all features.

## Styling

The component uses a dark theme by default that matches the MorphBox design. You can customize the appearance using:

1. The `theme` prop for built-in Monaco themes
2. CSS variables for container styling
3. Custom Monaco theme definitions

## Performance Notes

- The editor lazy-loads Monaco Editor on first mount
- Each tab maintains its own view state (cursor position, scroll, etc.)
- Large files (>10MB) may impact performance
- The editor automatically handles resize events

## Keyboard Shortcuts

- **Save**: Ctrl/Cmd + S
- **Find**: Ctrl/Cmd + F
- **Replace**: Ctrl/Cmd + H
- **Go to Line**: Ctrl/Cmd + G
- **Select All**: Ctrl/Cmd + A
- **Undo**: Ctrl/Cmd + Z
- **Redo**: Ctrl/Cmd + Shift + Z
- **Comment Line**: Ctrl/Cmd + /
- **Format Document**: Shift + Alt + F

## Integration with MorphBox

This component is designed to work seamlessly within the MorphBox panel system. It can be used alongside the Terminal component for a complete development environment.