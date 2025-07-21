<script>
  import { Keyboard, Command, Option, Shift, Control, Tab, ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-svelte';
  
  const shortcuts = [
    {
      category: 'General',
      items: [
        { keys: ['Cmd/Ctrl', 'K'], description: 'Open command palette' },
        { keys: ['Cmd/Ctrl', 'P'], description: 'Quick file open' },
        { keys: ['Cmd/Ctrl', 'Shift', 'P'], description: 'Command palette with all commands' },
        { keys: ['Cmd/Ctrl', '\\'], description: 'Toggle sidebar' }
      ]
    },
    {
      category: 'Terminal',
      items: [
        { keys: ['Ctrl', 'C'], description: 'Interrupt current process' },
        { keys: ['Ctrl', 'D'], description: 'Exit/logout terminal' },
        { keys: ['Ctrl', 'L'], description: 'Clear terminal screen' },
        { keys: ['Ctrl', 'A'], description: 'Move cursor to beginning of line' },
        { keys: ['Ctrl', 'E'], description: 'Move cursor to end of line' },
        { keys: ['Tab'], description: 'Auto-complete commands/paths' },
        { keys: ['↑/↓'], description: 'Navigate command history' },
        { keys: ['ESC'], description: 'Cancel current operation (via button)' },
        { keys: ['Shift', 'Tab'], description: 'Reverse tab completion (via button)' }
      ]
    },
    {
      category: 'Code Editor',
      items: [
        { keys: ['Cmd/Ctrl', 'S'], description: 'Save file' },
        { keys: ['Cmd/Ctrl', 'F'], description: 'Find in file' },
        { keys: ['Cmd/Ctrl', 'H'], description: 'Find and replace' },
        { keys: ['Cmd/Ctrl', 'G'], description: 'Go to line' },
        { keys: ['Cmd/Ctrl', 'D'], description: 'Select next occurrence' },
        { keys: ['Cmd/Ctrl', 'Shift', 'L'], description: 'Select all occurrences' },
        { keys: ['Alt', '↑/↓'], description: 'Move line up/down' },
        { keys: ['Alt', 'Shift', '↑/↓'], description: 'Copy line up/down' },
        { keys: ['Cmd/Ctrl', '/'], description: 'Toggle comment' },
        { keys: ['Tab'], description: 'Indent selection' },
        { keys: ['Shift', 'Tab'], description: 'Outdent selection' }
      ]
    },
    {
      category: 'File Explorer',
      items: [
        { keys: ['Enter'], description: 'Open file/expand folder' },
        { keys: ['Space'], description: 'Preview file' },
        { keys: ['Cmd/Ctrl', 'N'], description: 'New file' },
        { keys: ['Cmd/Ctrl', 'Shift', 'N'], description: 'New folder' },
        { keys: ['Delete'], description: 'Delete selected' },
        { keys: ['F2'], description: 'Rename file/folder' },
        { keys: ['↑/↓'], description: 'Navigate files' },
        { keys: ['←/→'], description: 'Collapse/expand folders' }
      ]
    },
    {
      category: 'Panel Management',
      items: [
        { keys: ['Cmd/Ctrl', 'B'], description: 'Toggle panel visibility' },
        { keys: ['Cmd/Ctrl', 'J'], description: 'Toggle terminal panel' },
        { keys: ['Cmd/Ctrl', 'Shift', 'E'], description: 'Focus file explorer' },
        { keys: ['Cmd/Ctrl', '1-9'], description: 'Switch to panel by number' },
        { keys: ['Cmd/Ctrl', 'W'], description: 'Close current panel' },
        { keys: ['Cmd/Ctrl', 'Shift', 'T'], description: 'Reopen closed panel' }
      ]
    },
    {
      category: 'Mobile Gestures',
      items: [
        { keys: ['Swipe Right'], description: 'Open sidebar/panel menu' },
        { keys: ['Swipe Left'], description: 'Close sidebar/panel menu' },
        { keys: ['Long Press'], description: 'Context menu' },
        { keys: ['Pinch'], description: 'Zoom in/out (code editor)' },
        { keys: ['Double Tap'], description: 'Quick actions' }
      ]
    }
  ];

  function formatKey(key) {
    const specialKeys = {
      'Cmd/Ctrl': '⌘/Ctrl',
      'Shift': '⇧',
      'Alt': '⌥',
      'Option': '⌥',
      'Tab': '⇥',
      'Enter': '⏎',
      'Delete': '⌫',
      'ESC': '⎋',
      '↑': '↑',
      '↓': '↓',
      '←': '←',
      '→': '→'
    };
    return specialKeys[key] || key;
  }
</script>

<svelte:head>
  <title>Keyboard Shortcuts - MorphBox Documentation</title>
</svelte:head>

<div class="shortcuts-page">
  <div class="page-header">
    <Keyboard size={32} />
    <h1>Keyboard Shortcuts</h1>
  </div>

  <p class="intro">
    Master MorphBox with these keyboard shortcuts. Use <kbd>Cmd</kbd> on macOS and <kbd>Ctrl</kbd> on Windows/Linux.
  </p>

  <div class="shortcuts-grid">
    {#each shortcuts as section}
      <div class="shortcut-section">
        <h2>{section.category}</h2>
        <div class="shortcut-list">
          {#each section.items as item}
            <div class="shortcut-item">
              <div class="keys">
                {#each item.keys as key, i}
                  <kbd>{formatKey(key)}</kbd>
                  {#if i < item.keys.length - 1}
                    <span class="plus">+</span>
                  {/if}
                {/each}
              </div>
              <div class="description">{item.description}</div>
            </div>
          {/each}
        </div>
      </div>
    {/each}
  </div>

  <div class="tips-section">
    <h2>Tips & Tricks</h2>
    <ul>
      <li><strong>Terminal Emulation:</strong> The ESC and Shift+Tab buttons in the terminal header are especially useful on mobile devices where these keys may not be available on the virtual keyboard.</li>
      <li><strong>Command Palette:</strong> Access almost any action through the command palette (<kbd>Cmd/Ctrl+K</kbd>). Start typing to filter commands.</li>
      <li><strong>Multi-cursor:</strong> Hold <kbd>Alt</kbd> and click to add multiple cursors in the code editor.</li>
      <li><strong>Quick Switch:</strong> Use <kbd>Cmd/Ctrl+P</kbd> to quickly switch between recent files.</li>
      <li><strong>Mobile Navigation:</strong> On mobile devices, use the panel menu button to switch between panels efficiently.</li>
    </ul>
  </div>

  <div class="customization-section">
    <h2>Customizing Shortcuts</h2>
    <p>
      You can customize keyboard shortcuts by creating a <code>keybindings.json</code> file in your MorphBox settings directory:
    </p>
    <pre><code>{`{
  "command-palette": ["cmd+k", "ctrl+k"],
  "save-file": ["cmd+s", "ctrl+s"],
  "terminal-clear": ["cmd+l", "ctrl+l"],
  // Add your custom bindings here
}`}</code></pre>
  </div>
</div>

<style>
  .shortcuts-page {
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

  .shortcuts-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
    gap: 2rem;
    margin-bottom: 3rem;
  }

  .shortcut-section {
    background: var(--surface-secondary);
    border-radius: 8px;
    padding: 1.5rem;
  }

  .shortcut-section h2 {
    margin: 0 0 1rem 0;
    font-size: 1.3rem;
    color: var(--text-primary);
  }

  .shortcut-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .shortcut-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem 0;
    border-bottom: 1px solid var(--border);
  }

  .shortcut-item:last-child {
    border-bottom: none;
  }

  .keys {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  kbd {
    display: inline-block;
    padding: 0.25rem 0.5rem;
    font-size: 0.85rem;
    font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
    background: var(--surface-primary);
    border: 1px solid var(--border);
    border-radius: 4px;
    box-shadow: 0 1px 0 rgba(0,0,0,0.1);
  }

  .plus {
    color: var(--text-secondary);
    font-size: 0.75rem;
  }

  .description {
    color: var(--text-secondary);
    font-size: 0.9rem;
  }

  .tips-section,
  .customization-section {
    background: var(--surface-secondary);
    border-radius: 8px;
    padding: 1.5rem;
    margin-bottom: 2rem;
  }

  .tips-section h2,
  .customization-section h2 {
    margin: 0 0 1rem 0;
  }

  .tips-section ul {
    margin: 0;
    padding-left: 1.5rem;
  }

  .tips-section li {
    margin-bottom: 0.75rem;
    line-height: 1.6;
  }

  .tips-section strong {
    color: var(--text-primary);
  }

  pre {
    background: var(--surface-primary);
    border: 1px solid var(--border);
    border-radius: 4px;
    padding: 1rem;
    overflow-x: auto;
  }

  code {
    font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
    font-size: 0.9rem;
  }

  @media (max-width: 768px) {
    .shortcuts-page {
      padding: 1rem;
    }

    .shortcuts-grid {
      grid-template-columns: 1fr;
      gap: 1rem;
    }

    .shortcut-item {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.5rem;
    }
  }
</style>