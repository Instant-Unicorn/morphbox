<script>
  import { Smartphone, Tablet, TouchpadIcon, Move, Maximize2, PanelLeft } from 'lucide-svelte';
  
  const features = [
    {
      icon: TouchpadIcon,
      title: 'Touch-Optimized Interface',
      description: 'Every component is designed for touch interaction with appropriately sized tap targets.'
    },
    {
      icon: PanelLeft,
      title: 'Adaptive Panels',
      description: 'Panels automatically adjust to mobile screen sizes with collapsible sidebars.'
    },
    {
      icon: Move,
      title: 'Gesture Support',
      description: 'Swipe to open/close panels, pinch to zoom in code editor, and more intuitive gestures.'
    },
    {
      icon: Maximize2,
      title: 'Resizable Terminal',
      description: 'Drag the terminal height on mobile for the perfect coding setup.'
    }
  ];

  const tips = [
    {
      category: 'Terminal Usage',
      items: [
        'Use the ESC and Shift+Tab buttons in the terminal header for keys not available on mobile keyboards',
        'Drag the resize handle at the top of the terminal to adjust height',
        'Long press in terminal to access copy/paste options',
        'Terminal sessions persist even when switching apps'
      ]
    },
    {
      category: 'Code Editor',
      items: [
        'Pinch to zoom for better readability',
        'Double-tap to select words',
        'Triple-tap to select lines',
        'Use the toolbar for common actions like save, find, and replace',
        'Swipe left/right on the tab bar to switch files'
      ]
    },
    {
      category: 'Panel Navigation',
      items: [
        'Tap the menu button to access all panels',
        'Swipe right from the left edge to open panel menu',
        'Swipe left to close panels',
        'Long press panel headers for options',
        'Use the color palette icon instead of individual color buttons'
      ]
    },
    {
      category: 'File Management',
      items: [
        'Tap files to open, tap folders to expand',
        'Long press for context menu (rename, delete, etc.)',
        'Use the + button to create new files/folders',
        'Files open in new panels automatically'
      ]
    }
  ];
</script>

<svelte:head>
  <title>Mobile Usage Guide - MorphBox Documentation</title>
</svelte:head>

<div class="mobile-guide">
  <div class="page-header">
    <Smartphone size={32} />
    <h1>Mobile Usage Guide</h1>
  </div>

  <p class="intro">
    MorphBox is fully optimized for mobile devices, providing a complete development environment on your phone or tablet.
  </p>

  <div class="features-grid">
    {#each features as feature}
      <div class="feature-card">
        <svelte:component this={feature.icon} size={24} />
        <h3>{feature.title}</h3>
        <p>{feature.description}</p>
      </div>
    {/each}
  </div>

  <div class="device-section">
    <h2>
      <Smartphone size={20} />
      Phone Experience
    </h2>
    <div class="device-content">
      <p>On phones, MorphBox adapts to the smaller screen with:</p>
      <ul>
        <li>Single panel view with quick switching</li>
        <li>Collapsible panels to maximize screen space</li>
        <li>Optimized touch targets for accuracy</li>
        <li>Virtual keyboard-aware layouts</li>
      </ul>
      
      <div class="screenshot-placeholder">
        <p>MorphBox on iPhone</p>
      </div>
    </div>
  </div>

  <div class="device-section">
    <h2>
      <Tablet size={20} />
      Tablet Experience
    </h2>
    <div class="device-content">
      <p>Tablets get an enhanced experience with:</p>
      <ul>
        <li>Split-screen panel layouts</li>
        <li>Desktop-like file explorer</li>
        <li>Extended keyboard shortcuts</li>
        <li>Multi-touch gestures</li>
      </ul>
      
      <div class="screenshot-placeholder">
        <p>MorphBox on iPad</p>
      </div>
    </div>
  </div>

  <div class="tips-container">
    <h2>Tips & Best Practices</h2>
    
    {#each tips as section}
      <div class="tip-section">
        <h3>{section.category}</h3>
        <ul>
          {#each section.items as tip}
            <li>{tip}</li>
          {/each}
        </ul>
      </div>
    {/each}
  </div>

  <div class="troubleshooting">
    <h2>Common Issues & Solutions</h2>
    
    <div class="issue">
      <h4>Virtual keyboard covers content</h4>
      <p>The layout automatically adjusts when the keyboard appears. If issues persist, try rotating your device or adjusting the terminal height.</p>
    </div>
    
    <div class="issue">
      <h4>Text selection difficulties</h4>
      <p>Use the magnifying glass gesture (long press) for precise cursor placement. Double and triple tap for word/line selection.</p>
    </div>
    
    <div class="issue">
      <h4>Panel switching feels slow</h4>
      <p>Use swipe gestures instead of buttons for faster navigation. Swipe from the left edge to quickly access the panel menu.</p>
    </div>
    
    <div class="issue">
      <h4>Terminal keys missing</h4>
      <p>Use the ESC and Shift+Tab buttons in the terminal header. For more special keys, consider using a mobile terminal keyboard app.</p>
    </div>
  </div>

  <div class="optimization-tips">
    <h2>Performance Optimization</h2>
    <ul>
      <li><strong>Close unused panels:</strong> Free up memory by closing panels you're not actively using</li>
      <li><strong>Use lightweight themes:</strong> Dark themes typically use less battery on OLED screens</li>
      <li><strong>Limit terminal scrollback:</strong> Large scrollback buffers can impact performance</li>
      <li><strong>Enable hardware acceleration:</strong> Ensure your browser settings have this enabled</li>
    </ul>
  </div>

  <div class="external-keyboards">
    <h2>External Keyboard Support</h2>
    <p>
      When using an external keyboard with your mobile device, MorphBox provides a desktop-like experience:
    </p>
    <ul>
      <li>All desktop keyboard shortcuts work as expected</li>
      <li>Tab key properly functions in terminal and code editor</li>
      <li>Cmd/Ctrl combinations for quick actions</li>
      <li>Arrow keys for navigation</li>
    </ul>
  </div>
</div>

<style>
  .mobile-guide {
    padding: 2rem;
    max-width: 1000px;
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

  .features-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1.5rem;
    margin-bottom: 3rem;
  }

  .feature-card {
    background: var(--surface-secondary);
    border-radius: 8px;
    padding: 1.5rem;
    text-align: center;
  }

  .feature-card h3 {
    margin: 0.75rem 0 0.5rem;
    font-size: 1.1rem;
  }

  .feature-card p {
    margin: 0;
    color: var(--text-secondary);
    font-size: 0.9rem;
  }

  .device-section {
    background: var(--surface-secondary);
    border-radius: 8px;
    padding: 1.5rem;
    margin-bottom: 2rem;
  }

  .device-section h2 {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin: 0 0 1rem 0;
  }

  .device-content ul {
    margin: 1rem 0;
    padding-left: 1.5rem;
  }

  .screenshot-placeholder {
    background: var(--surface-primary);
    border: 1px solid var(--border);
    border-radius: 4px;
    padding: 3rem;
    text-align: center;
    color: var(--text-secondary);
    font-style: italic;
  }

  .tips-container {
    margin-bottom: 2rem;
  }

  .tips-container h2 {
    margin-bottom: 1.5rem;
  }

  .tip-section {
    background: var(--surface-secondary);
    border-radius: 8px;
    padding: 1.5rem;
    margin-bottom: 1rem;
  }

  .tip-section h3 {
    margin: 0 0 1rem 0;
    color: var(--text-primary);
  }

  .tip-section ul {
    margin: 0;
    padding-left: 1.5rem;
  }

  .tip-section li {
    margin-bottom: 0.5rem;
    line-height: 1.6;
  }

  .troubleshooting {
    background: var(--surface-secondary);
    border-radius: 8px;
    padding: 1.5rem;
    margin-bottom: 2rem;
  }

  .troubleshooting h2 {
    margin: 0 0 1.5rem 0;
  }

  .issue {
    margin-bottom: 1.5rem;
    padding-bottom: 1.5rem;
    border-bottom: 1px solid var(--border);
  }

  .issue:last-child {
    margin-bottom: 0;
    padding-bottom: 0;
    border-bottom: none;
  }

  .issue h4 {
    margin: 0 0 0.5rem 0;
    color: var(--text-primary);
  }

  .issue p {
    margin: 0;
    color: var(--text-secondary);
  }

  .optimization-tips,
  .external-keyboards {
    background: var(--surface-secondary);
    border-radius: 8px;
    padding: 1.5rem;
    margin-bottom: 2rem;
  }

  .optimization-tips h2,
  .external-keyboards h2 {
    margin: 0 0 1rem 0;
  }

  .optimization-tips ul,
  .external-keyboards ul {
    margin: 1rem 0 0 0;
    padding-left: 1.5rem;
  }

  .optimization-tips li,
  .external-keyboards li {
    margin-bottom: 0.5rem;
    line-height: 1.6;
  }

  @media (max-width: 768px) {
    .mobile-guide {
      padding: 1rem;
    }

    .features-grid {
      grid-template-columns: 1fr;
    }
  }
</style>