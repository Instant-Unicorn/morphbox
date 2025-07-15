<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import { fade, slide } from 'svelte/transition';
  import { panels } from '$lib/stores/panels';
  import { saveGeneratedPanel } from '$lib/panels/generator';
  import type { GeneratedPanel } from '$lib/panels/generator';
  
  const dispatch = createEventDispatcher();
  
  // Wizard state
  let currentStep = 1;
  let isGenerating = false;
  let generatedCode = '';
  
  // Form data
  let panelType: 'custom' | 'template' = 'custom';
  let selectedTemplate = '';
  let panelName = '';
  let panelDescription = '';
  let features = {
    stateManagement: false,
    apiAccess: false,
    websocket: false,
    fileSystem: false,
    terminal: false,
    dataVisualization: false,
    formHandling: false,
    authentication: false
  };
  
  // Panel templates
  const templates = [
    {
      id: 'dashboard',
      name: 'Dashboard',
      description: 'Data visualization and monitoring panel',
      features: ['stateManagement', 'apiAccess', 'dataVisualization'],
      icon: '📊'
    },
    {
      id: 'file-manager',
      name: 'File Manager',
      description: 'Browse and manage files',
      features: ['stateManagement', 'fileSystem', 'apiAccess'],
      icon: '📁'
    },
    {
      id: 'code-editor',
      name: 'Code Editor',
      description: 'Syntax-highlighted code editor',
      features: ['stateManagement', 'fileSystem'],
      icon: '📝'
    },
    {
      id: 'terminal',
      name: 'Terminal',
      description: 'Interactive terminal emulator',
      features: ['websocket', 'terminal'],
      icon: '🖥️'
    },
    {
      id: 'api-tester',
      name: 'API Tester',
      description: 'Test and debug API endpoints',
      features: ['apiAccess', 'formHandling', 'stateManagement'],
      icon: '🔌'
    },
    {
      id: 'data-table',
      name: 'Data Table',
      description: 'Display and manipulate tabular data',
      features: ['stateManagement', 'apiAccess', 'formHandling'],
      icon: '📋'
    },
    {
      id: 'settings',
      name: 'Settings',
      description: 'Configuration and preferences panel',
      features: ['stateManagement', 'formHandling'],
      icon: '⚙️'
    },
    {
      id: 'chat',
      name: 'Chat',
      description: 'Real-time messaging interface',
      features: ['websocket', 'stateManagement', 'authentication'],
      icon: '💬'
    }
  ];
  
  // Feature descriptions
  const featureDescriptions = {
    stateManagement: 'Local state management with Svelte stores',
    apiAccess: 'HTTP client for API requests',
    websocket: 'WebSocket connection handling',
    fileSystem: 'File system access and operations',
    terminal: 'Terminal command execution',
    dataVisualization: 'Charts and graphs support',
    formHandling: 'Form validation and submission',
    authentication: 'User authentication flow'
  };
  
  // Step navigation
  function nextStep() {
    if (currentStep < 3) {
      currentStep++;
    } else if (currentStep === 3) {
      generatePanel();
    }
  }
  
  function prevStep() {
    if (currentStep > 1) {
      currentStep--;
    }
  }
  
  // Template selection
  function selectTemplate(templateId: string) {
    selectedTemplate = templateId;
    const template = templates.find(t => t.id === templateId);
    if (template) {
      // Pre-fill name and description
      panelName = template.name;
      panelDescription = template.description;
      // Pre-select features
      Object.keys(features).forEach(key => {
        features[key as keyof typeof features] = template.features.includes(key);
      });
    }
  }
  
  // Generate panel code
  async function generatePanel() {
    isGenerating = true;
    
    try {
      // Generate the panel component code
      const code = generatePanelCode();
      generatedCode = code;
      
      // Move to step 4 (preview)
      currentStep = 4;
    } catch (error) {
      console.error('Error generating panel:', error);
    } finally {
      isGenerating = false;
    }
  }
  
  // Generate panel component code
  function generatePanelCode(): string {
    const fileName = toKebabCase(panelName);
    const componentName = toPascalCase(panelName);
    
    let imports = [];
    let script = [];
    let markup = [];
    let styles = [];
    
    // Base imports
    imports.push(`import { onMount, onDestroy } from 'svelte';`);
    
    // Add feature-specific imports and code
    if (features.stateManagement) {
      imports.push(`import { writable } from 'svelte/store';`);
      script.push(`
  // Local state store
  const state = writable({
    initialized: false,
    data: null,
    loading: false,
    error: null
  });`);
    }
    
    if (features.apiAccess) {
      script.push(`
  // API helper function
  async function fetchData(endpoint: string) {
    state.update(s => ({ ...s, loading: true, error: null }));
    try {
      const response = await fetch(endpoint);
      if (!response.ok) throw new Error(\`HTTP error! status: \${response.status}\`);
      const data = await response.json();
      state.update(s => ({ ...s, data, loading: false }));
      return data;
    } catch (error) {
      state.update(s => ({ ...s, error: error.message, loading: false }));
      console.error('API Error:', error);
    }
  }`);
    }
    
    if (features.websocket) {
      imports.push(`import { WebSocketClient } from '$lib/websocket';`);
      script.push(`
  // WebSocket connection
  let ws: WebSocketClient;
  
  onMount(() => {
    ws = new WebSocketClient('ws://localhost:8009');
    ws.on('message', handleMessage);
    ws.connect();
  });
  
  onDestroy(() => {
    ws?.disconnect();
  });
  
  function handleMessage(data: any) {
    console.log('WebSocket message:', data);
    // Handle incoming messages
  }`);
    }
    
    if (features.fileSystem) {
      script.push(`
  // File system operations
  let currentPath = '/';
  let files = [];
  
  async function loadDirectory(path: string) {
    // Implementation would connect to backend file system API
    console.log('Loading directory:', path);
  }
  
  async function openFile(filePath: string) {
    // Implementation would load file contents
    console.log('Opening file:', filePath);
  }`);
    }
    
    if (features.terminal) {
      imports.push(`import Terminal from '$lib/Terminal.svelte';`);
      script.push(`
  // Terminal reference
  let terminal: Terminal;`);
      markup.push(`
  <div class="terminal-container">
    <Terminal bind:this={terminal} />
  </div>`);
    }
    
    if (features.dataVisualization) {
      script.push(`
  // Chart configuration
  let chartData = {
    labels: [],
    datasets: []
  };
  
  function updateChart(data: any) {
    // Update chart data
    chartData = processChartData(data);
  }
  
  function processChartData(raw: any) {
    // Process raw data for charts
    return { labels: [], datasets: [] };
  }`);
    }
    
    if (features.formHandling) {
      script.push(`
  // Form handling
  let formData = {};
  let formErrors = {};
  
  function handleSubmit(event: Event) {
    event.preventDefault();
    if (validateForm()) {
      submitForm();
    }
  }
  
  function validateForm() {
    formErrors = {};
    // Add validation logic
    return Object.keys(formErrors).length === 0;
  }
  
  async function submitForm() {
    // Submit form data
    console.log('Submitting form:', formData);
  }`);
    }
    
    if (features.authentication) {
      script.push(`
  // Authentication state
  let isAuthenticated = false;
  let user = null;
  
  async function login(credentials: any) {
    // Implement login logic
    console.log('Logging in...');
  }
  
  async function logout() {
    // Implement logout logic
    isAuthenticated = false;
    user = null;
  }`);
    }
    
    // Component lifecycle
    script.push(`
  onMount(() => {
    console.log('${componentName} panel mounted');
    ${features.stateManagement ? `state.update(s => ({ ...s, initialized: true }));` : ''}
  });
  
  onDestroy(() => {
    console.log('${componentName} panel destroyed');
  });`);
    
    // Build the markup
    if (!features.terminal) {
      markup.push(`
<div class="panel-container">
  <header class="panel-header">
    <h2>${panelName}</h2>
    ${features.authentication ? `
    {#if isAuthenticated}
      <span class="user-info">👤 {user?.name || 'User'}</span>
    {/if}` : ''}
  </header>
  
  <main class="panel-content">
    ${features.stateManagement ? `
    {#if $state.loading}
      <div class="loading">Loading...</div>
    {:else if $state.error}
      <div class="error">Error: {$state.error}</div>
    {:else}` : ''}
      <p>${panelDescription}</p>
      <!-- Add your panel content here -->
    ${features.stateManagement ? '{/if}' : ''}
  </main>
  
  ${features.formHandling ? `
  <footer class="panel-footer">
    <form on:submit={handleSubmit}>
      <!-- Add form fields here -->
      <button type="submit">Submit</button>
    </form>
  </footer>` : ''}
</div>`);
    }
    
    // Build styles
    styles.push(`
  .panel-container {
    display: flex;
    flex-direction: column;
    height: 100%;
    background-color: var(--panel-bg, #1e1e1e);
    color: var(--panel-text, #d4d4d4);
  }
  
  .panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    background-color: var(--header-bg, #2d2d30);
    border-bottom: 1px solid var(--border-color, #3e3e42);
  }
  
  .panel-header h2 {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
  }
  
  .panel-content {
    flex: 1;
    padding: 16px;
    overflow-y: auto;
  }
  
  ${features.terminal ? `
  .terminal-container {
    height: 100%;
    background-color: #000;
  }` : ''}
  
  ${features.formHandling ? `
  .panel-footer {
    padding: 12px 16px;
    background-color: var(--footer-bg, #252526);
    border-top: 1px solid var(--border-color, #3e3e42);
  }
  
  form {
    display: flex;
    gap: 8px;
  }
  
  button {
    padding: 6px 12px;
    background-color: var(--button-bg, #0e639c);
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
  }
  
  button:hover {
    background-color: var(--button-hover, #1177bb);
  }` : ''}
  
  .loading, .error {
    padding: 20px;
    text-align: center;
  }
  
  .error {
    color: var(--error-color, #f48771);
  }
  
  .user-info {
    font-size: 14px;
    color: var(--muted-text, #858585);
  }`);
    
    // Generate the complete component
    return `<script lang="ts">
${imports.join('\n')}
${script.join('\n')}
<\/script>

${markup.join('\n')}

<style>
${styles.join('\n')}
</style>`;
  }
  
  // Utility functions
  function toKebabCase(str: string): string {
    return str
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .replace(/[\s_]+/g, '-')
      .toLowerCase();
  }
  
  function toPascalCase(str: string): string {
    return str
      .split(/[\s-_]+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
  }
  
  // Close wizard
  function closeWizard() {
    dispatch('close');
  }
  
  // Create and register panel
  async function createPanel() {
    const fileName = toKebabCase(panelName);
    const id = `panel-${fileName}-${Date.now()}`;
    
    // Create panel object for saving
    const generatedPanel: GeneratedPanel = {
      id,
      name: panelName,
      description: panelDescription,
      fileName: `${fileName}.svelte`,
      filePath: `$lib/panels/${fileName}/${fileName}.svelte`,
      code: generatedCode,
      features: Object.entries(features)
        .filter(([_, enabled]) => enabled)
        .map(([feature]) => feature)
    };
    
    // Save the panel and register it
    const saved = await saveGeneratedPanel(generatedPanel);
    
    if (saved) {
      // Add the panel to the active panels
      panels.addPanel(fileName, {
        title: panelName,
        type: fileName,
        content: {
          description: panelDescription,
          features: generatedPanel.features,
          code: generatedCode
        }
      });
      
      // Dispatch success event
      dispatch('created', { panel: generatedPanel });
    }
    
    // Close the wizard
    closeWizard();
  }
  
  // Validation
  $: canProceed = currentStep === 1 ? panelType !== null :
                  currentStep === 2 ? panelName.trim() !== '' :
                  currentStep === 3 ? true :
                  false;
  
  $: if (panelType === 'template' && selectedTemplate) {
    selectTemplate(selectedTemplate);
  }
  
  function handleOverlayKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      closeWizard();
    }
  }
</script>

<div class="wizard-overlay" role="dialog" aria-modal="true" aria-label="Create Panel Wizard" on:click={closeWizard} on:keydown={handleOverlayKeydown}>
  <div class="wizard-container" role="document" on:click|stopPropagation transition:fade={{ duration: 200 }}>
    <header class="wizard-header">
      <h2>Create New Panel</h2>
      <button class="close-button" on:click={closeWizard}>×</button>
    </header>
    
    <div class="wizard-progress">
      <div class="progress-step" class:active={currentStep >= 1} class:completed={currentStep > 1}>
        <span class="step-number">1</span>
        <span class="step-label">Type</span>
      </div>
      <div class="progress-line" class:active={currentStep > 1}></div>
      <div class="progress-step" class:active={currentStep >= 2} class:completed={currentStep > 2}>
        <span class="step-number">2</span>
        <span class="step-label">Details</span>
      </div>
      <div class="progress-line" class:active={currentStep > 2}></div>
      <div class="progress-step" class:active={currentStep >= 3} class:completed={currentStep > 3}>
        <span class="step-number">3</span>
        <span class="step-label">Features</span>
      </div>
    </div>
    
    <div class="wizard-content">
      {#if currentStep === 1}
        <div class="step-content" transition:slide>
          <h3>Choose Panel Type</h3>
          <p class="step-description">Start with a template or create a custom panel from scratch.</p>
          
          <div class="panel-type-selection">
            <label class="type-option" class:selected={panelType === 'custom'}>
              <input type="radio" bind:group={panelType} value="custom" />
              <div class="type-card">
                <span class="type-icon">🎨</span>
                <h4>Custom Panel</h4>
                <p>Build a panel from scratch with your chosen features</p>
              </div>
            </label>
            
            <label class="type-option" class:selected={panelType === 'template'}>
              <input type="radio" bind:group={panelType} value="template" />
              <div class="type-card">
                <span class="type-icon">📋</span>
                <h4>From Template</h4>
                <p>Start with a pre-configured panel template</p>
              </div>
            </label>
          </div>
          
          {#if panelType === 'template'}
            <div class="template-grid" transition:slide>
              <h4>Select a Template</h4>
              <div class="templates">
                {#each templates as template}
                  <button 
                    class="template-card" 
                    class:selected={selectedTemplate === template.id}
                    on:click={() => selectedTemplate = template.id}
                  >
                    <span class="template-icon">{template.icon}</span>
                    <h5>{template.name}</h5>
                    <p>{template.description}</p>
                  </button>
                {/each}
              </div>
            </div>
          {/if}
        </div>
      {/if}
      
      {#if currentStep === 2}
        <div class="step-content" transition:slide>
          <h3>Panel Details</h3>
          <p class="step-description">Provide basic information about your panel.</p>
          
          <div class="form-group">
            <label for="panel-name">Panel Name</label>
            <input 
              id="panel-name"
              type="text" 
              bind:value={panelName} 
              placeholder="e.g. Data Explorer"
              maxlength="50"
            />
            <small>This will be used as the panel title and file name</small>
          </div>
          
          <div class="form-group">
            <label for="panel-description">Description</label>
            <textarea 
              id="panel-description"
              bind:value={panelDescription} 
              placeholder="Describe what this panel does..."
              rows="3"
              maxlength="200"
            ></textarea>
            <small>{panelDescription.length}/200 characters</small>
          </div>
          
          {#if panelName}
            <div class="preview-info">
              <h4>Preview</h4>
              <p><strong>File:</strong> /panels/{toKebabCase(panelName)}/{toKebabCase(panelName)}.svelte</p>
              <p><strong>Component:</strong> {toPascalCase(panelName)}</p>
            </div>
          {/if}
        </div>
      {/if}
      
      {#if currentStep === 3}
        <div class="step-content" transition:slide>
          <h3>Select Features</h3>
          <p class="step-description">Choose the features your panel will need.</p>
          
          <div class="features-grid">
            {#each Object.entries(features) as [feature, enabled]}
              <label class="feature-option">
                <input 
                  type="checkbox" 
                  bind:checked={features[feature]}
                />
                <div class="feature-card" class:selected={enabled}>
                  <h5>{feature.replace(/([A-Z])/g, ' $1').trim()}</h5>
                  <p>{featureDescriptions[feature]}</p>
                </div>
              </label>
            {/each}
          </div>
        </div>
      {/if}
      
      {#if currentStep === 4}
        <div class="step-content" transition:slide>
          <h3>Generated Code</h3>
          <p class="step-description">Review the generated panel code before creating.</p>
          
          <div class="code-preview">
            <div class="code-header">
              <span>{toKebabCase(panelName)}.svelte</span>
              <button class="copy-button" on:click={() => navigator.clipboard.writeText(generatedCode)}>
                Copy Code
              </button>
            </div>
            <pre><code>{generatedCode}</code></pre>
          </div>
        </div>
      {/if}
    </div>
    
    <footer class="wizard-footer">
      <button 
        class="btn-secondary" 
        on:click={currentStep === 1 ? closeWizard : prevStep}
        disabled={isGenerating}
      >
        {currentStep === 1 ? 'Cancel' : 'Previous'}
      </button>
      
      {#if currentStep < 4}
        <button 
          class="btn-primary" 
          on:click={nextStep}
          disabled={!canProceed || isGenerating}
        >
          {currentStep === 3 ? (isGenerating ? 'Generating...' : 'Generate Code') : 'Next'}
        </button>
      {:else}
        <button 
          class="btn-primary" 
          on:click={createPanel}
        >
          Create Panel
        </button>
      {/if}
    </footer>
  </div>
</div>

<style>
  .wizard-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }
  
  .wizard-container {
    background-color: #1e1e1e;
    border: 1px solid #3e3e42;
    border-radius: 8px;
    width: 90%;
    max-width: 800px;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  }
  
  .wizard-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px 24px;
    border-bottom: 1px solid #3e3e42;
  }
  
  .wizard-header h2 {
    margin: 0;
    font-size: 20px;
    color: #cccccc;
  }
  
  .close-button {
    background: none;
    border: none;
    font-size: 24px;
    color: #858585;
    cursor: pointer;
    padding: 0;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    transition: background-color 0.2s;
  }
  
  .close-button:hover {
    background-color: #3c3c3c;
    color: #cccccc;
  }
  
  /* Progress indicator */
  .wizard-progress {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    gap: 0;
  }
  
  .progress-step {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    position: relative;
  }
  
  .step-number {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background-color: #3c3c3c;
    color: #858585;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    font-size: 14px;
    transition: all 0.3s;
  }
  
  .progress-step.active .step-number {
    background-color: #0e639c;
    color: white;
  }
  
  .progress-step.completed .step-number {
    background-color: #4ec9b0;
    color: white;
  }
  
  .step-label {
    font-size: 12px;
    color: #858585;
  }
  
  .progress-step.active .step-label {
    color: #cccccc;
  }
  
  .progress-line {
    width: 80px;
    height: 2px;
    background-color: #3c3c3c;
    margin: 0 -8px;
    margin-bottom: 24px;
    transition: background-color 0.3s;
  }
  
  .progress-line.active {
    background-color: #4ec9b0;
  }
  
  /* Content area */
  .wizard-content {
    flex: 1;
    padding: 24px;
    overflow-y: auto;
    min-height: 300px;
  }
  
  .step-content h3 {
    margin: 0 0 8px 0;
    font-size: 18px;
    color: #cccccc;
  }
  
  .step-description {
    color: #858585;
    margin-bottom: 24px;
  }
  
  /* Step 1: Panel type selection */
  .panel-type-selection {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    margin-bottom: 24px;
  }
  
  .type-option {
    cursor: pointer;
  }
  
  .type-option input {
    display: none;
  }
  
  .type-card {
    padding: 24px;
    border: 2px solid #3e3e42;
    border-radius: 8px;
    text-align: center;
    transition: all 0.2s;
  }
  
  .type-option.selected .type-card,
  .type-card:hover {
    border-color: #0e639c;
    background-color: #252526;
  }
  
  .type-icon {
    font-size: 48px;
    display: block;
    margin-bottom: 16px;
  }
  
  .type-card h4 {
    margin: 0 0 8px 0;
    font-size: 16px;
    color: #cccccc;
  }
  
  .type-card p {
    margin: 0;
    font-size: 14px;
    color: #858585;
  }
  
  /* Template grid */
  .template-grid h4 {
    margin: 0 0 16px 0;
    color: #cccccc;
  }
  
  .templates {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 12px;
  }
  
  .template-card {
    padding: 16px;
    border: 2px solid #3e3e42;
    border-radius: 8px;
    background-color: #252526;
    cursor: pointer;
    transition: all 0.2s;
    text-align: left;
  }
  
  .template-card:hover {
    border-color: #0e639c;
    transform: translateY(-2px);
  }
  
  .template-card.selected {
    border-color: #0e639c;
    background-color: #2d2d30;
  }
  
  .template-icon {
    font-size: 32px;
    display: block;
    margin-bottom: 8px;
  }
  
  .template-card h5 {
    margin: 0 0 4px 0;
    font-size: 14px;
    color: #cccccc;
  }
  
  .template-card p {
    margin: 0;
    font-size: 12px;
    color: #858585;
  }
  
  /* Step 2: Form fields */
  .form-group {
    margin-bottom: 20px;
  }
  
  .form-group label {
    display: block;
    margin-bottom: 8px;
    font-size: 14px;
    color: #cccccc;
    font-weight: 500;
  }
  
  .form-group input,
  .form-group textarea {
    width: 100%;
    padding: 8px 12px;
    background-color: #3c3c3c;
    border: 1px solid #3e3e42;
    border-radius: 4px;
    color: #d4d4d4;
    font-size: 14px;
    font-family: inherit;
  }
  
  .form-group input:focus,
  .form-group textarea:focus {
    outline: none;
    border-color: #0e639c;
    background-color: #2d2d30;
  }
  
  .form-group small {
    display: block;
    margin-top: 4px;
    font-size: 12px;
    color: #858585;
  }
  
  .preview-info {
    background-color: #252526;
    border: 1px solid #3e3e42;
    border-radius: 4px;
    padding: 16px;
    margin-top: 24px;
  }
  
  .preview-info h4 {
    margin: 0 0 8px 0;
    font-size: 14px;
    color: #cccccc;
  }
  
  .preview-info p {
    margin: 4px 0;
    font-size: 13px;
    color: #858585;
  }
  
  .preview-info strong {
    color: #cccccc;
  }
  
  /* Step 3: Features grid */
  .features-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 12px;
  }
  
  .feature-option {
    cursor: pointer;
  }
  
  .feature-option input {
    display: none;
  }
  
  .feature-card {
    padding: 16px;
    border: 2px solid #3e3e42;
    border-radius: 8px;
    background-color: #252526;
    transition: all 0.2s;
  }
  
  .feature-card:hover {
    border-color: #0e639c;
  }
  
  .feature-card.selected {
    border-color: #4ec9b0;
    background-color: #2d2d30;
  }
  
  .feature-card h5 {
    margin: 0 0 4px 0;
    font-size: 14px;
    color: #cccccc;
    text-transform: capitalize;
  }
  
  .feature-card p {
    margin: 0;
    font-size: 12px;
    color: #858585;
  }
  
  /* Step 4: Code preview */
  .code-preview {
    background-color: #1e1e1e;
    border: 1px solid #3e3e42;
    border-radius: 4px;
    overflow: hidden;
  }
  
  .code-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 16px;
    background-color: #2d2d30;
    border-bottom: 1px solid #3e3e42;
  }
  
  .code-header span {
    font-size: 13px;
    color: #cccccc;
    font-family: "Cascadia Code", "Fira Code", monospace;
  }
  
  .copy-button {
    padding: 4px 12px;
    background-color: #3c3c3c;
    border: 1px solid #3e3e42;
    border-radius: 4px;
    color: #cccccc;
    font-size: 12px;
    cursor: pointer;
    transition: background-color 0.2s;
  }
  
  .copy-button:hover {
    background-color: #484848;
  }
  
  pre {
    margin: 0;
    padding: 16px;
    overflow-x: auto;
    max-height: 400px;
  }
  
  code {
    font-family: "Cascadia Code", "Fira Code", monospace;
    font-size: 13px;
    color: #d4d4d4;
    white-space: pre;
  }
  
  /* Footer */
  .wizard-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 24px;
    border-top: 1px solid #3e3e42;
  }
  
  .btn-primary,
  .btn-secondary {
    padding: 8px 20px;
    border: none;
    border-radius: 4px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .btn-primary {
    background-color: #0e639c;
    color: white;
  }
  
  .btn-primary:hover:not(:disabled) {
    background-color: #1177bb;
  }
  
  .btn-primary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .btn-secondary {
    background-color: #3c3c3c;
    color: #cccccc;
    border: 1px solid #3e3e42;
  }
  
  .btn-secondary:hover:not(:disabled) {
    background-color: #484848;
  }
  
  /* Mobile responsive */
  @media (max-width: 768px) {
    .wizard-container {
      width: 95%;
      max-height: 95vh;
    }
    
    .panel-type-selection {
      grid-template-columns: 1fr;
    }
    
    .templates {
      grid-template-columns: 1fr;
    }
    
    .features-grid {
      grid-template-columns: 1fr;
    }
    
    .progress-line {
      width: 40px;
    }
  }
</style>