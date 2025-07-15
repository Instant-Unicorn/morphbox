# MorphBox Layout System Components

A set of flexible, reusable layout components for building resizable split-pane interfaces.

## Components

### SplitPane

A resizable split pane component that divides space between two content areas.

#### Props
- `orientation`: 'horizontal' | 'vertical' (default: 'horizontal')
- `split`: number - Initial split percentage for first pane (default: 50)
- `minSize`: number - Minimum size in pixels (default: 100)
- `maxSize`: number | null - Maximum size in pixels (default: null)
- `disabled`: boolean - Disable resizing (default: false)
- `className`: string - Additional CSS classes
- `pane1Class`: string - CSS classes for first pane
- `pane2Class`: string - CSS classes for second pane

#### Events
- `splitstart`: Fired when drag starts
- `splitchange`: Fired during drag with current split details
- `splitend`: Fired when drag ends

#### Slots
- `pane1`: Content for the first pane
- `pane2`: Content for the second pane

#### Example
```svelte
<SplitPane 
  orientation="horizontal" 
  split={60} 
  minSize={200}
  on:splitchange={(e) => console.log(e.detail)}
>
  <div slot="pane1">Left content</div>
  <div slot="pane2">Right content</div>
</SplitPane>
```

### PanelContainer

A container component with optional header, close button, and collapse functionality.

#### Props
- `title`: string - Panel title (default: '')
- `showHeader`: boolean - Show/hide header (default: true)
- `closable`: boolean - Show close button (default: false)
- `collapsible`: boolean - Enable collapse functionality (default: false)
- `collapsed`: boolean - Current collapsed state (default: false)
- `className`: string - Additional CSS classes
- `headerActions`: boolean - Enable header actions slot (default: true)

#### Events
- `close`: Fired when close button is clicked
- `collapse`: Fired when panel is collapsed/expanded

#### Slots
- Default slot: Panel content
- `header-actions`: Custom actions in the header

#### Example
```svelte
<PanelContainer 
  title="My Panel" 
  closable={true}
  collapsible={true}
  on:close={() => console.log('Panel closed')}
>
  <button slot="header-actions">Settings</button>
  <div>Panel content goes here</div>
</PanelContainer>
```

### DragHandle

A draggable resize handle used by SplitPane (can also be used standalone).

#### Props
- `orientation`: 'horizontal' | 'vertical' (default: 'horizontal')
- `disabled`: boolean - Disable dragging (default: false)

#### Events
- `dragstart`: Fired when drag starts
- `drag`: Fired during drag with delta and position
- `dragend`: Fired when drag ends

## Keyboard Support

The SplitPane component supports keyboard navigation:
- **Arrow Keys**: Adjust split position (hold Shift for larger steps)
- **Home**: Move to minimum position
- **End**: Move to maximum position

## CSS Variables

Customize the appearance using CSS variables:

```css
:root {
  /* Drag Handle */
  --drag-handle-size: 6px;
  --drag-handle-bg: #e0e0e0;
  --drag-handle-hover-bg: #bdbdbd;
  --drag-handle-active-bg: #2196F3;
  --drag-handle-grip-color: #999;
  
  /* Panel Container */
  --panel-bg: white;
  --panel-border: #e0e0e0;
  --panel-radius: 6px;
  --panel-header-bg: #f8f8f8;
  --panel-header-height: 40px;
  --panel-title-size: 14px;
  --panel-content-padding: 16px;
  
  /* Scrollbar */
  --scrollbar-track: #f1f1f1;
  --scrollbar-thumb: #c1c1c1;
  --scrollbar-thumb-hover: #a8a8a8;
}
```

## Complex Layout Example

```svelte
<script>
  import { SplitPane, PanelContainer } from '$lib/components';
</script>

<!-- Three-column layout with collapsible sidebar -->
<SplitPane orientation="horizontal" split={20} minSize={150}>
  <!-- Sidebar -->
  <PanelContainer slot="pane1" title="Navigation" collapsible={true}>
    <nav>Navigation items...</nav>
  </PanelContainer>
  
  <!-- Main area with vertical split -->
  <div slot="pane2">
    <SplitPane orientation="vertical" split={70} minSize={100}>
      <!-- Editor -->
      <PanelContainer slot="pane1" title="Editor">
        <div>Code editor content...</div>
      </PanelContainer>
      
      <!-- Terminal -->
      <PanelContainer slot="pane2" title="Terminal" closable={true}>
        <div>Terminal output...</div>
      </PanelContainer>
    </SplitPane>
  </div>
</SplitPane>
```

## Features

- **Smooth Dragging**: Proper mouse capture ensures smooth resizing
- **Touch Support**: Works on touch devices
- **Keyboard Navigation**: Full keyboard support for accessibility
- **Nested Layouts**: SplitPanes can be nested for complex layouts
- **Constraints**: Min/max size constraints prevent unusable layouts
- **Responsive**: Automatically adjusts when container resizes
- **Customizable**: Extensive CSS variable support for theming