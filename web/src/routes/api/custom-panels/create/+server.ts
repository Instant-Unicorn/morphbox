import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';

const PANELS_DIR = join(homedir(), 'morphbox', 'panels');

// Panel templates
const templates = {
  basic: `<!--
@morphbox-panel
id: {id}
name: {name}
description: {description}
version: 1.0.0
features: []
-->

<script lang="ts">
  import { onMount } from 'svelte';
  
  // Panel properties passed from the panel system
  export let panelId: string;
  export let data: any = {};
  
  let message = 'Hello from {name}!';
  
  onMount(() => {
    console.log('Panel mounted:', panelId);
  });
</script>

<div class="custom-panel">
  <h2>{message}</h2>
  <p>{description}</p>
</div>

<style>
  .custom-panel {
    padding: 20px;
    height: 100%;
    overflow: auto;
  }
  
  h2 {
    margin: 0 0 10px 0;
    color: var(--text-primary);
  }
  
  p {
    color: var(--text-secondary);
  }
</style>`,

  api: `<!--
@morphbox-panel
id: {id}
name: {name}
description: {description}
version: 1.0.0
features: [api, async]
-->

<script lang="ts">
  import { onMount } from 'svelte';
  
  export let panelId: string;
  export let data: any = {};
  
  let loading = true;
  let error: string | null = null;
  let apiData: any = null;
  
  async function fetchData() {
    try {
      loading = true;
      error = null;
      
      // Example API call - replace with your endpoint
      const response = await fetch('/api/example');
      if (!response.ok) throw new Error('Failed to fetch data');
      
      apiData = await response.json();
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unknown error';
    } finally {
      loading = false;
    }
  }
  
  onMount(() => {
    fetchData();
  });
</script>

<div class="api-panel">
  <div class="header">
    <h2>{name}</h2>
    <button on:click={fetchData} disabled={loading}>
      {loading ? 'Loading...' : 'Refresh'}
    </button>
  </div>
  
  {#if error}
    <div class="error">Error: {error}</div>
  {:else if loading}
    <div class="loading">Loading...</div>
  {:else if apiData}
    <pre>{JSON.stringify(apiData, null, 2)}</pre>
  {/if}
</div>

<style>
  .api-panel {
    padding: 20px;
    height: 100%;
    display: flex;
    flex-direction: column;
  }
  
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
  }
  
  h2 {
    margin: 0;
    color: var(--text-primary);
  }
  
  button {
    padding: 6px 12px;
    background: var(--button-bg);
    color: var(--button-text);
    border: 1px solid var(--border-color);
    border-radius: 4px;
    cursor: pointer;
  }
  
  button:hover:not(:disabled) {
    background: var(--button-hover-bg);
  }
  
  button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  
  .error {
    color: var(--error-color, #f44336);
    padding: 10px;
    background: rgba(244, 67, 54, 0.1);
    border-radius: 4px;
  }
  
  .loading {
    color: var(--text-secondary);
    text-align: center;
    padding: 20px;
  }
  
  pre {
    flex: 1;
    overflow: auto;
    background: var(--bg-secondary);
    padding: 10px;
    border-radius: 4px;
    margin: 0;
    color: var(--text-primary);
  }
</style>`,

  chart: `<!--
@morphbox-panel
id: {id}
name: {name}
description: {description}
version: 1.0.0
features: [visualization, chart]
-->

<script lang="ts">
  import { onMount } from 'svelte';
  
  export let panelId: string;
  export let data: any = {};
  
  let canvas: HTMLCanvasElement;
  let chart: any;
  
  // Sample data - replace with your own
  const chartData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    values: [12, 19, 3, 5, 2, 3]
  };
  
  function drawChart() {
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Simple bar chart implementation
    const padding = 40;
    const chartWidth = canvas.width - padding * 2;
    const chartHeight = canvas.height - padding * 2;
    const barWidth = chartWidth / chartData.labels.length;
    const maxValue = Math.max(...chartData.values);
    
    // Draw bars
    ctx.fillStyle = 'var(--accent-color, #4CAF50)';
    chartData.values.forEach((value, index) => {
      const barHeight = (value / maxValue) * chartHeight;
      const x = padding + index * barWidth + barWidth * 0.1;
      const y = canvas.height - padding - barHeight;
      const width = barWidth * 0.8;
      
      ctx.fillRect(x, y, width, barHeight);
    });
    
    // Draw labels
    ctx.fillStyle = 'var(--text-primary)';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    
    chartData.labels.forEach((label, index) => {
      const x = padding + index * barWidth + barWidth / 2;
      const y = canvas.height - padding + 20;
      ctx.fillText(label, x, y);
    });
  }
  
  onMount(() => {
    // Set canvas size
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    
    drawChart();
    
    // Redraw on resize
    const resizeObserver = new ResizeObserver(() => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      drawChart();
    });
    
    resizeObserver.observe(canvas);
    
    return () => {
      resizeObserver.disconnect();
    };
  });
</script>

<div class="chart-panel">
  <h2>{name}</h2>
  <canvas bind:this={canvas}></canvas>
</div>

<style>
  .chart-panel {
    padding: 20px;
    height: 100%;
    display: flex;
    flex-direction: column;
  }
  
  h2 {
    margin: 0 0 20px 0;
    color: var(--text-primary);
  }
  
  canvas {
    flex: 1;
    width: 100%;
    border: 1px solid var(--border-color);
    border-radius: 4px;
    background: var(--bg-secondary);
  }
</style>`,

  form: `<!--
@morphbox-panel
id: {id}
name: {name}
description: {description}
version: 1.0.0
features: [form, input]
-->

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  
  export let panelId: string;
  export let data: any = {};
  
  const dispatch = createEventDispatcher();
  
  // Form data
  let formData = {
    name: '',
    email: '',
    message: ''
  };
  
  function handleSubmit() {
    // Dispatch event with form data
    dispatch('submit', formData);
    
    // You can also save to localStorage or send to an API
    console.log('Form submitted:', formData);
    
    // Reset form
    formData = { name: '', email: '', message: '' };
  }
</script>

<div class="form-panel">
  <h2>{name}</h2>
  
  <form on:submit|preventDefault={handleSubmit}>
    <div class="form-group">
      <label for="name">Name:</label>
      <input
        id="name"
        type="text"
        bind:value={formData.name}
        required
      />
    </div>
    
    <div class="form-group">
      <label for="email">Email:</label>
      <input
        id="email"
        type="email"
        bind:value={formData.email}
        required
      />
    </div>
    
    <div class="form-group">
      <label for="message">Message:</label>
      <textarea
        id="message"
        bind:value={formData.message}
        rows="4"
        required
      ></textarea>
    </div>
    
    <button type="submit">Submit</button>
  </form>
</div>

<style>
  .form-panel {
    padding: 20px;
    height: 100%;
    overflow: auto;
  }
  
  h2 {
    margin: 0 0 20px 0;
    color: var(--text-primary);
  }
  
  form {
    display: flex;
    flex-direction: column;
    gap: 15px;
    max-width: 400px;
  }
  
  .form-group {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }
  
  label {
    color: var(--text-primary);
    font-size: 14px;
    font-weight: 500;
  }
  
  input,
  textarea {
    padding: 8px 12px;
    background: var(--input-bg, var(--bg-secondary));
    color: var(--text-primary);
    border: 1px solid var(--border-color);
    border-radius: 4px;
    font-family: inherit;
    font-size: 14px;
  }
  
  input:focus,
  textarea:focus {
    outline: none;
    border-color: var(--accent-color);
  }
  
  button {
    padding: 10px 20px;
    background: var(--accent-color, #4CAF50);
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    align-self: flex-start;
  }
  
  button:hover {
    opacity: 0.9;
  }
  
  button:active {
    transform: translateY(1px);
  }
</style>`
};

function generatePanelId(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') + 
    '-' + 
    Date.now().toString(36);
}

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { name, description, template } = await request.json();
    
    if (!name || !description || !template) {
      return json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    if (!templates[template as keyof typeof templates]) {
      return json({ error: 'Invalid template' }, { status: 400 });
    }
    
    // Ensure the directory exists
    await mkdir(PANELS_DIR, { recursive: true });
    
    // Generate panel ID and filename
    const id = generatePanelId(name);
    const filename = `${id}.svelte`;
    const filepath = join(PANELS_DIR, filename);
    
    // Generate panel content from template
    const content = templates[template as keyof typeof templates]
      .replace(/{id}/g, id)
      .replace(/{name}/g, name)
      .replace(/{description}/g, description);
    
    // Write the file
    await writeFile(filepath, content, 'utf-8');
    
    return json({
      id,
      filename,
      path: filepath
    });
  } catch (error) {
    console.error('Failed to create custom panel:', error);
    return json({ error: 'Failed to create panel' }, { status: 500 });
  }
};