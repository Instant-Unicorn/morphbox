<script>
  import { Terminal, Download, CheckCircle, AlertCircle, Cpu, HardDrive, Globe } from 'lucide-svelte';
  
  const requirements = [
    { icon: Cpu, label: 'CPU', value: '2+ cores recommended' },
    { icon: HardDrive, label: 'RAM', value: '4GB minimum, 8GB recommended' },
    { icon: HardDrive, label: 'Storage', value: '10GB free space' },
    { icon: Globe, label: 'Network', value: 'Internet connection for updates' }
  ];
  
  const steps = [
    {
      title: 'Install Docker',
      description: 'MorphBox runs in Docker containers for consistency across platforms.',
      commands: [
        { label: 'macOS', cmd: 'brew install docker' },
        { label: 'Ubuntu/Debian', cmd: 'sudo apt install docker.io docker-compose' },
        { label: 'Windows', cmd: 'Download Docker Desktop from docker.com' }
      ]
    },
    {
      title: 'Clone Repository',
      description: 'Get the latest MorphBox source code.',
      commands: [
        { label: 'HTTPS', cmd: 'git clone https://github.com/morphbox/morphbox.git' },
        { label: 'SSH', cmd: 'git clone git@github.com:morphbox/morphbox.git' }
      ]
    },
    {
      title: 'Configure Environment',
      description: 'Set up your environment variables.',
      commands: [
        { label: 'Copy template', cmd: 'cp .env.example .env' },
        { label: 'Edit settings', cmd: 'nano .env' }
      ]
    },
    {
      title: 'Start MorphBox',
      description: 'Launch the application with Docker Compose.',
      commands: [
        { label: 'Standard', cmd: 'docker-compose up -d' },
        { label: 'With persistence', cmd: 'docker-compose -f docker-compose.persist.yml up -d' }
      ]
    }
  ];
</script>

<svelte:head>
  <title>Installation - MorphBox Documentation</title>
</svelte:head>

<div class="installation-guide">
  <div class="page-header">
    <Download size={32} />
    <h1>Installation Guide</h1>
  </div>

  <p class="intro">
    Get MorphBox up and running in minutes. Choose between standard installation or persistent mode for production use.
  </p>

  <div class="requirements-section">
    <h2>System Requirements</h2>
    <div class="requirements-grid">
      {#each requirements as req}
        <div class="requirement-card">
          <svelte:component this={req.icon} size={24} />
          <div class="requirement-info">
            <div class="label">{req.label}</div>
            <div class="value">{req.value}</div>
          </div>
        </div>
      {/each}
    </div>
  </div>

  <div class="installation-steps">
    <h2>Installation Steps</h2>
    
    {#each steps as step, i}
      <div class="step">
        <div class="step-number">{i + 1}</div>
        <div class="step-content">
          <h3>{step.title}</h3>
          <p>{step.description}</p>
          <div class="commands">
            {#each step.commands as cmd}
              <div class="command-block">
                <div class="command-label">{cmd.label}:</div>
                <div class="command-wrapper">
                  <code>{cmd.cmd}</code>
                  <button class="copy-btn" on:click={() => navigator.clipboard.writeText(cmd.cmd)}>
                    Copy
                  </button>
                </div>
              </div>
            {/each}
          </div>
        </div>
      </div>
    {/each}
  </div>

  <div class="quick-start">
    <h2>Quick Start (One-liner)</h2>
    <p>For the impatient, here's a one-line installation:</p>
    <div class="command-wrapper large">
      <code>curl -fsSL https://get.morphbox.io | bash</code>
      <button class="copy-btn" on:click={() => navigator.clipboard.writeText('curl -fsSL https://get.morphbox.io | bash')}>
        Copy
      </button>
    </div>
  </div>

  <div class="installation-modes">
    <h2>Installation Modes</h2>
    
    <div class="mode-cards">
      <div class="mode-card">
        <h3>Standard Mode</h3>
        <p>Best for development and testing. Quick to set up but data doesn't persist between restarts.</p>
        <code>docker-compose up -d</code>
        <ul>
          <li>Quick setup</li>
          <li>Minimal configuration</li>
          <li>Good for testing</li>
        </ul>
      </div>
      
      <div class="mode-card recommended">
        <div class="recommended-badge">Recommended</div>
        <h3>Persistent Mode</h3>
        <p>Production-ready setup with data persistence, session recovery, and automatic backups.</p>
        <code>docker-compose -f docker-compose.persist.yml up -d</code>
        <ul>
          <li>Data persists between restarts</li>
          <li>Terminal sessions survive</li>
          <li>Automatic Claude updates</li>
          <li>Custom panels preserved</li>
        </ul>
      </div>
    </div>
  </div>

  <div class="configuration">
    <h2>Configuration</h2>
    
    <h3>Environment Variables</h3>
    <p>Key settings in your <code>.env</code> file:</p>
    
    <pre><code>{`# Port Configuration
MORPHBOX_PORT=3000
WEBSOCKET_PORT=3001

# Security
AUTH_SECRET=your-secret-key
ENABLE_AUTH=true

# Persistence
ENABLE_PERSISTENCE=true
BACKUP_INTERVAL=3600

# Custom Panels
CUSTOM_PANELS_DIR=~/morphbox/panels

# Theme
DEFAULT_THEME=dark`}</code></pre>

    <h3>Custom Configuration</h3>
    <p>Create <code>morphbox.config.js</code> for advanced settings:</p>
    
    <pre><code>{`export default {
  // Terminal settings
  terminal: {
    shell: '/bin/bash',
    fontSize: 14,
    scrollback: 10000
  },
  
  // Editor settings
  editor: {
    theme: 'vs-dark',
    tabSize: 2,
    wordWrap: 'on'
  },
  
  // Panel defaults
  panels: {
    defaultLayout: 'split',
    animationSpeed: 300
  }
}`}</code></pre>
  </div>

  <div class="verification">
    <h2>Verify Installation</h2>
    
    <div class="verify-steps">
      <div class="verify-step">
        <CheckCircle size={20} class="success" />
        <div>
          <h4>Check Docker Status</h4>
          <code>docker ps | grep morphbox</code>
        </div>
      </div>
      
      <div class="verify-step">
        <CheckCircle size={20} class="success" />
        <div>
          <h4>Access Web Interface</h4>
          <code>http://localhost:3000</code>
        </div>
      </div>
      
      <div class="verify-step">
        <CheckCircle size={20} class="success" />
        <div>
          <h4>Test Terminal</h4>
          <p>Open a terminal panel and run: <code>echo "Hello MorphBox!"</code></p>
        </div>
      </div>
    </div>
  </div>

  <div class="troubleshooting">
    <h2>Troubleshooting</h2>
    
    <div class="trouble-item">
      <div class="trouble-header">
        <AlertCircle size={20} />
        <h4>Port Already in Use</h4>
      </div>
      <p>Change the port in your <code>.env</code> file:</p>
      <code>MORPHBOX_PORT=8080</code>
    </div>
    
    <div class="trouble-item">
      <div class="trouble-header">
        <AlertCircle size={20} />
        <h4>Permission Denied</h4>
      </div>
      <p>Add your user to the docker group:</p>
      <code>sudo usermod -aG docker $USER</code>
    </div>
    
    <div class="trouble-item">
      <div class="trouble-header">
        <AlertCircle size={20} />
        <h4>Container Won't Start</h4>
      </div>
      <p>Check logs for errors:</p>
      <code>docker-compose logs -f morphbox</code>
    </div>
  </div>

  <div class="next-steps">
    <h2>Next Steps</h2>
    <p>Now that MorphBox is installed:</p>
    <ul>
      <li><a href="/docs/getting-started/first-steps">First Steps Guide</a> - Learn the basics</li>
      <li><a href="/docs/user-guide/terminal-persistence">Set up persistence</a> - Keep your work safe</li>
      <li><a href="/docs/user-guide/custom-panels">Create custom panels</a> - Extend functionality</li>
      <li><a href="/docs/user-guide/keyboard-shortcuts">Learn shortcuts</a> - Work faster</li>
    </ul>
  </div>
</div>

<style>
  .installation-guide {
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

  .requirements-section {
    margin-bottom: 3rem;
  }

  .requirements-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
    margin-top: 1rem;
  }

  .requirement-card {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    background: var(--surface-secondary);
    border-radius: 8px;
  }

  .requirement-info .label {
    font-weight: 600;
    color: var(--text-primary);
  }

  .requirement-info .value {
    font-size: 0.9rem;
    color: var(--text-secondary);
  }

  .installation-steps {
    margin-bottom: 3rem;
  }

  .step {
    display: flex;
    gap: 1.5rem;
    margin-bottom: 2rem;
  }

  .step-number {
    flex-shrink: 0;
    width: 40px;
    height: 40px;
    background: var(--primary);
    color: white;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
  }

  .step-content {
    flex: 1;
  }

  .step-content h3 {
    margin: 0 0 0.5rem 0;
  }

  .step-content p {
    margin: 0 0 1rem 0;
    color: var(--text-secondary);
  }

  .commands {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .command-block {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .command-label {
    font-size: 0.85rem;
    color: var(--text-secondary);
    font-weight: 500;
  }

  .command-wrapper {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: var(--surface-primary);
    border: 1px solid var(--border);
    border-radius: 4px;
    padding: 0.75rem;
  }

  .command-wrapper.large {
    padding: 1rem;
    margin-top: 1rem;
  }

  code {
    flex: 1;
    font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
    font-size: 0.9rem;
  }

  .copy-btn {
    padding: 0.25rem 0.5rem;
    background: var(--surface-secondary);
    border: 1px solid var(--border);
    border-radius: 4px;
    font-size: 0.85rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .copy-btn:hover {
    background: var(--surface-tertiary);
  }

  .quick-start {
    background: var(--surface-secondary);
    border-radius: 8px;
    padding: 1.5rem;
    margin-bottom: 3rem;
  }

  .installation-modes {
    margin-bottom: 3rem;
  }

  .mode-cards {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 1.5rem;
    margin-top: 1rem;
  }

  .mode-card {
    position: relative;
    background: var(--surface-secondary);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 1.5rem;
  }

  .mode-card.recommended {
    border-color: var(--primary);
    box-shadow: 0 0 0 1px var(--primary);
  }

  .recommended-badge {
    position: absolute;
    top: -10px;
    right: 20px;
    background: var(--primary);
    color: white;
    padding: 0.25rem 0.75rem;
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: 600;
  }

  .mode-card h3 {
    margin: 0 0 0.5rem 0;
  }

  .mode-card p {
    margin: 0.5rem 0 1rem 0;
    color: var(--text-secondary);
  }

  .mode-card code {
    display: block;
    padding: 0.5rem;
    background: var(--surface-primary);
    border: 1px solid var(--border);
    border-radius: 4px;
    margin-bottom: 1rem;
  }

  .mode-card ul {
    margin: 0;
    padding-left: 1.5rem;
  }

  .configuration pre {
    background: var(--surface-primary);
    border: 1px solid var(--border);
    border-radius: 4px;
    padding: 1rem;
    overflow-x: auto;
  }

  .verification {
    background: var(--surface-secondary);
    border-radius: 8px;
    padding: 1.5rem;
    margin-bottom: 3rem;
  }

  .verify-steps {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin-top: 1rem;
  }

  .verify-step {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
  }

  .verify-step h4 {
    margin: 0 0 0.25rem 0;
  }

  .verify-step code {
    display: inline-block;
    padding: 0.25rem 0.5rem;
    background: var(--surface-primary);
    border: 1px solid var(--border);
    border-radius: 4px;
  }

  :global(.success) {
    color: var(--success);
  }

  .troubleshooting {
    margin-bottom: 3rem;
  }

  .trouble-item {
    background: var(--surface-secondary);
    border-radius: 8px;
    padding: 1rem;
    margin-bottom: 1rem;
  }

  .trouble-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }

  .trouble-header h4 {
    margin: 0;
  }

  .trouble-item p {
    margin: 0.5rem 0;
    color: var(--text-secondary);
  }

  .trouble-item code {
    display: inline-block;
    padding: 0.25rem 0.5rem;
    background: var(--surface-primary);
    border: 1px solid var(--border);
    border-radius: 4px;
  }

  .next-steps {
    background: var(--surface-secondary);
    border-radius: 8px;
    padding: 1.5rem;
  }

  .next-steps ul {
    margin: 1rem 0 0 0;
    padding-left: 1.5rem;
  }

  .next-steps li {
    margin-bottom: 0.5rem;
  }

  .next-steps a {
    color: var(--primary);
    text-decoration: none;
  }

  .next-steps a:hover {
    text-decoration: underline;
  }

  @media (max-width: 768px) {
    .installation-guide {
      padding: 1rem;
    }

    .mode-cards {
      grid-template-columns: 1fr;
    }
  }
</style>