# FileExplorer Component

A file explorer panel for the MorphBox application that provides a tree view of files and directories with support for common file operations.

## Features

- **Tree View Navigation**: Browse files and directories in a hierarchical tree structure
- **File Selection**: Click to select files, with visual feedback
- **File Opening**: Double-click files to open them (emits `open` event)
- **Context Menu**: Right-click on items for contextual actions
- **File Operations**:
  - Create new files and folders
  - Rename items
  - Delete files and folders (with confirmation)
- **Visual Features**:
  - File icons based on file extensions
  - Special icons for common folders (node_modules, src, dist, etc.)
  - Expand/collapse directories with smooth animations
  - Loading indicators for async operations

## Usage

```svelte
<script>
  import FileExplorer from '$lib/panels/FileExplorer/FileExplorer.svelte';
  
  let selectedFile = null;
  
  function handleFileSelect(event) {
    selectedFile = event.detail.path;
    console.log('Selected:', selectedFile);
  }
  
  function handleFileOpen(event) {
    console.log('Open file:', event.detail.path);
    // Open file in editor
  }
</script>

<FileExplorer
  rootPath="/workspace"
  {selectedFile}
  on:select={handleFileSelect}
  on:open={handleFileOpen}
/>
```

## Props

- `rootPath` (string): The root directory path to display (default: '/workspace')
- `selectedFile` (string | null): Currently selected file path

## Events

- `select`: Fired when a file or directory is selected
  - `event.detail.path`: The path of the selected item
- `open`: Fired when a file is double-clicked
  - `event.detail.path`: The path of the file to open

## Integration with WebSocket

The component includes placeholder functions in `fileOperations.ts` that should be connected to your WebSocket server for real file system operations:

```typescript
// Example WebSocket message format for file operations
ws.send(JSON.stringify({
  type: 'fs:list',
  path: '/workspace'
}));

ws.send(JSON.stringify({
  type: 'fs:create-file',
  directory: '/workspace/src',
  name: 'newfile.ts'
}));

ws.send(JSON.stringify({
  type: 'fs:create-directory',
  directory: '/workspace',
  name: 'new-folder'
}));

ws.send(JSON.stringify({
  type: 'fs:delete',
  path: '/workspace/src/oldfile.ts'
}));

ws.send(JSON.stringify({
  type: 'fs:rename',
  oldPath: '/workspace/src/old.ts',
  newPath: '/workspace/src/new.ts'
}));
```

## Styling

The component uses VS Code-inspired dark theme styling that integrates with the MorphBox theme. Key CSS variables:

- Background: `#252526`
- Text: `#cccccc`
- Selected: `#094771`
- Hover: `#2a2d2e`
- Border: `#3e3e42`

## File Icons

The component includes a comprehensive icon mapping for common file types:

- Programming languages (JS, TS, Python, etc.)
- Web files (HTML, CSS)
- Data files (JSON, XML, YAML)
- Documentation (MD, PDF)
- Media files (images, videos, audio)
- Archives (ZIP, TAR)
- Special files (package.json, Dockerfile, etc.)

## Mobile Support

On mobile devices (screens < 768px), the sidebar containing the FileExplorer is hidden by default to maximize screen space for the terminal.

## Future Enhancements

- Drag and drop support for moving files
- Multi-select with Ctrl/Cmd+Click
- Cut/Copy/Paste operations
- Search functionality
- File preview on hover
- Integration with Git status indicators