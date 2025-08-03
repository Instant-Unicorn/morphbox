<script lang="ts">
  import { onMount } from 'svelte';
  
  let currentTime = new Date().toLocaleString();
  
  onMount(() => {
    const interval = setInterval(() => {
      currentTime = new Date().toLocaleString();
    }, 1000);
    
    return () => clearInterval(interval);
  });

  const quickLinks = [
    {
      title: 'Installation',
      description: 'Get MorphBox up and running in minutes',
      href: '/docs/getting-started/installation',
      icon: '🚀'
    },
    {
      title: 'Quick Start',
      description: 'Your first steps with MorphBox',
      href: '/docs/getting-started/quick-start',
      icon: '⚡'
    },
    {
      title: 'Custom Panels',
      description: 'Create, share, and import panels with .morph files',
      href: '/docs/user-guide/custom-panels',
      icon: '🎨'
    },
    {
      title: 'API Reference',
      description: 'Complete API documentation for panel development',
      href: '/docs/api-reference/overview',
      icon: '🔧'
    },
    {
      title: 'Terminal Sessions',
      description: 'Persistent terminal sessions that survive browser restarts',
      href: '/docs/user-guide/terminal-persistence',
      icon: '🖥️'
    },
    {
      title: 'Mobile Usage',
      description: 'Use MorphBox on tablets and phones with touch support',
      href: '/docs/user-guide/mobile-usage',
      icon: '📱'
    }
  ];

  const features = [
    {
      title: '.morph File Format',
      description: 'Portable custom panels in a single file. Export and import panels with complete history. Share with the community easily.',
      icon: '📦'
    },
    {
      title: 'AI Panel Generation',
      description: 'Create custom panels using natural language. Claude generates complete HTML/CSS/JS panels. Modify existing panels with AI assistance.',
      icon: '🤖'
    },
    {
      title: 'Persistent Sessions',
      description: 'Terminal sessions survive disconnections and browser restarts. Multiple independent terminals with full PTY support.',
      icon: '🔄'
    },
    {
      title: 'Mobile Support',
      description: 'Touch-friendly interface with virtual keyboard. Bottom sheet panel manager. Responsive design for all devices.',
      icon: '📱'
    },
    {
      title: 'NPM Distribution',
      description: 'Install globally with npm or use npx. Cross-platform support for macOS, Linux, and Windows.',
      icon: '📦'
    },
    {
      title: 'Secure Sandbox',
      description: 'VM isolation with network filtering. Whitelist-based domain access. Clean snapshots with --reset.',
      icon: '🔒'
    }
  ];
</script>

<svelte:head>
  <title>MorphBox Documentation</title>
  <meta name="description" content="Complete documentation for MorphBox - a fast-loading safe AI sandbox for development" />
</svelte:head>

<div class="docs-home">
  <!-- Hero Section -->
  <section class="hero">
    <div class="hero-content">
      <h1>MorphBox Documentation</h1>
      <p class="hero-subtitle">
        Complete guide to using MorphBox - a fast-loading safe AI sandbox for development with Claude AI integration.
      </p>
      <div class="hero-stats">
        <div class="stat">
          <strong>Version 0.7.1</strong>
          <span>Latest Release</span>
        </div>
        <div class="stat">
          <strong>Apache 2.0</strong>
          <span>Open Source License</span>
        </div>
        <div class="stat">
          <strong>{currentTime}</strong>
          <span>Documentation Generated</span>
        </div>
      </div>
    </div>
  </section>

  <!-- Quick Links -->
  <section class="quick-links">
    <h2>Quick Start</h2>
    <div class="links-grid">
      {#each quickLinks as link}
        <a href={link.href} class="quick-link-card">
          <div class="link-icon">{link.icon}</div>
          <h3>{link.title}</h3>
          <p>{link.description}</p>
          <div class="link-arrow">→</div>
        </a>
      {/each}
    </div>
  </section>

  <!-- Features Overview -->
  <section class="features">
    <h2>Key Features</h2>
    <div class="features-grid">
      {#each features as feature}
        <div class="feature-card">
          <div class="feature-icon">{feature.icon}</div>
          <h3>{feature.title}</h3>
          <p>{feature.description}</p>
        </div>
      {/each}
    </div>
  </section>

  <!-- Getting Started -->
  <section class="getting-started">
    <h2>Get Started in Minutes</h2>
    <div class="steps">
      <div class="step">
        <div class="step-number">1</div>
        <div class="step-content">
          <h3>Install MorphBox</h3>
          <p>Download and install MorphBox using our simple installation script</p>
          <a href="/docs/getting-started/installation" class="step-link">Installation Guide →</a>
        </div>
      </div>
      <div class="step">
        <div class="step-number">2</div>
        <div class="step-content">
          <h3>Authenticate with Claude</h3>
          <p>Set up Claude authentication once and enjoy persistent sessions</p>
          <a href="/docs/user-guide/authentication" class="step-link">Auth Setup →</a>
        </div>
      </div>
      <div class="step">
        <div class="step-number">3</div>
        <div class="step-content">
          <h3>Start Building</h3>
          <p>Use MorphBox's powerful features to enhance your development workflow</p>
          <a href="/docs/user-guide" class="step-link">User Guide →</a>
        </div>
      </div>
    </div>
  </section>

  <!-- Help & Support -->
  <section class="support">
    <h2>Need Help?</h2>
    <div class="support-grid">
      <div class="support-card">
        <h3>📖 User Guide</h3>
        <p>Comprehensive documentation covering all MorphBox features</p>
        <a href="/docs/user-guide">Browse User Guide</a>
      </div>
      <div class="support-card">
        <h3>🐛 Troubleshooting</h3>
        <p>Common issues and their solutions</p>
        <a href="/docs/support/troubleshooting">Get Help</a>
      </div>
      <div class="support-card">
        <h3>💬 Community</h3>
        <p>Connect with other MorphBox users and contributors</p>
        <a href="/docs/support/community">Join Community</a>
      </div>
      <div class="support-card">
        <h3>🚀 Contributing</h3>
        <p>Help improve MorphBox by contributing code or documentation</p>
        <a href="/docs/contributing">Start Contributing</a>
      </div>
    </div>
  </section>
</div>

<style>
  .docs-home {
    max-width: 1200px;
    margin: 0 auto;
  }

  /* Hero Section */
  .hero {
    text-align: center;
    padding: 60px 0;
    border-bottom: 1px solid var(--border-color, #3e3e42);
    margin-bottom: 60px;
  }

  .hero h1 {
    font-size: 3rem;
    font-weight: 700;
    margin: 0 0 16px 0;
    background: linear-gradient(135deg, var(--accent-color, #4ec9b0), #007acc);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .hero-subtitle {
    font-size: 1.25rem;
    color: var(--text-secondary, #cccccc);
    margin: 0 0 40px 0;
    max-width: 600px;
    margin-left: auto;
    margin-right: auto;
    line-height: 1.5;
  }

  .hero-stats {
    display: flex;
    justify-content: center;
    gap: 40px;
    flex-wrap: wrap;
  }

  .stat {
    text-align: center;
  }

  .stat strong {
    display: block;
    font-size: 1.125rem;
    color: var(--text-primary, #d4d4d4);
    margin-bottom: 4px;
  }

  .stat span {
    font-size: 0.875rem;
    color: var(--text-tertiary, #858585);
  }

  /* Quick Links */
  .quick-links {
    margin-bottom: 80px;
  }

  .quick-links h2 {
    font-size: 2rem;
    margin: 0 0 32px 0;
    color: var(--text-primary, #d4d4d4);
  }

  .links-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 24px;
  }

  .quick-link-card {
    display: block;
    padding: 24px;
    background-color: var(--bg-secondary, #252526);
    border: 1px solid var(--border-color, #3e3e42);
    border-radius: 8px;
    text-decoration: none;
    transition: all 0.2s;
    position: relative;
    overflow: hidden;
  }

  .quick-link-card:hover {
    border-color: var(--accent-color, #4ec9b0);
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
  }

  .link-icon {
    font-size: 2rem;
    margin-bottom: 12px;
  }

  .quick-link-card h3 {
    font-size: 1.25rem;
    margin: 0 0 8px 0;
    color: var(--text-primary, #d4d4d4);
  }

  .quick-link-card p {
    margin: 0;
    color: var(--text-tertiary, #858585);
    line-height: 1.5;
  }

  .link-arrow {
    position: absolute;
    top: 24px;
    right: 24px;
    color: var(--accent-color, #4ec9b0);
    font-size: 1.5rem;
    opacity: 0;
    transition: opacity 0.2s;
  }

  .quick-link-card:hover .link-arrow {
    opacity: 1;
  }

  /* Features */
  .features {
    margin-bottom: 80px;
  }

  .features h2 {
    font-size: 2rem;
    margin: 0 0 32px 0;
    color: var(--text-primary, #d4d4d4);
  }

  .features-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 24px;
  }

  .feature-card {
    padding: 24px;
    background-color: var(--bg-secondary, #252526);
    border: 1px solid var(--border-color, #3e3e42);
    border-radius: 8px;
  }

  .feature-icon {
    font-size: 2rem;
    margin-bottom: 12px;
  }

  .feature-card h3 {
    font-size: 1.125rem;
    margin: 0 0 8px 0;
    color: var(--text-primary, #d4d4d4);
  }

  .feature-card p {
    margin: 0;
    color: var(--text-tertiary, #858585);
    line-height: 1.5;
  }

  /* Getting Started */
  .getting-started {
    margin-bottom: 80px;
  }

  .getting-started h2 {
    font-size: 2rem;
    margin: 0 0 32px 0;
    color: var(--text-primary, #d4d4d4);
  }

  .steps {
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  .step {
    display: flex;
    gap: 24px;
    align-items: flex-start;
  }

  .step-number {
    width: 48px;
    height: 48px;
    background-color: var(--accent-color, #4ec9b0);
    color: var(--bg-primary, #1e1e1e);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 1.25rem;
    flex-shrink: 0;
  }

  .step-content h3 {
    font-size: 1.25rem;
    margin: 0 0 8px 0;
    color: var(--text-primary, #d4d4d4);
  }

  .step-content p {
    margin: 0 0 12px 0;
    color: var(--text-secondary, #cccccc);
    line-height: 1.5;
  }

  .step-link {
    color: var(--accent-color, #4ec9b0);
    text-decoration: none;
    font-weight: 500;
  }

  .step-link:hover {
    text-decoration: underline;
  }

  /* Support */
  .support h2 {
    font-size: 2rem;
    margin: 0 0 32px 0;
    color: var(--text-primary, #d4d4d4);
  }

  .support-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 24px;
  }

  .support-card {
    padding: 24px;
    background-color: var(--bg-secondary, #252526);
    border: 1px solid var(--border-color, #3e3e42);
    border-radius: 8px;
  }

  .support-card h3 {
    font-size: 1.125rem;
    margin: 0 0 8px 0;
    color: var(--text-primary, #d4d4d4);
  }

  .support-card p {
    margin: 0 0 16px 0;
    color: var(--text-tertiary, #858585);
    line-height: 1.5;
  }

  .support-card a {
    color: var(--accent-color, #4ec9b0);
    text-decoration: none;
    font-weight: 500;
  }

  .support-card a:hover {
    text-decoration: underline;
  }

  /* Mobile Responsive */
  @media (max-width: 768px) {
    .hero h1 {
      font-size: 2rem;
    }

    .hero-subtitle {
      font-size: 1.125rem;
    }

    .hero-stats {
      gap: 24px;
    }

    .links-grid {
      grid-template-columns: 1fr;
    }

    .features-grid {
      grid-template-columns: 1fr;
    }

    .step {
      flex-direction: column;
      gap: 16px;
    }

    .support-grid {
      grid-template-columns: 1fr;
    }
  }
</style>