<script lang="ts">
  import { onMount, onDestroy, tick } from 'svelte';
  import { 
    Play, Square, Trash2, Plus, Terminal, Package,
    ChevronRight, ChevronDown, Clock, CheckCircle, XCircle,
    Save, X, RefreshCw, Zap
  } from 'lucide-svelte';
  import { taskStore, activeTask, runningTasks, npmScripts, customPresets, type Task } from './task-store';
  
  let commandInput = '';
  let nameInput = '';
  let showAddTask = false;
  let outputContainer: HTMLDivElement;
  let autoScroll = true;
  let expandedSections = {
    npm: true,
    custom: true,
    running: true,
    completed: false
  };
  
  // Polling for task output
  let pollInterval: number;
  let taskOutputCache = new Map<string, number>(); // Track last line number per task
  
  onMount(async () => {
    console.log('[TaskRunner] Component mounted');
    // Load npm scripts
    await loadPackageScripts();
    
    // Start polling for active tasks
    startPolling();
  });
  
  onDestroy(() => {
    if (pollInterval) {
      clearInterval(pollInterval);
    }
  });
  
  function startPolling() {
    // Poll every 500ms for output updates
    pollInterval = window.setInterval(async () => {
      // Check all running tasks
      for (const task of $runningTasks) {
        await pollTaskOutput(task);
      }
    }, 500);
  }
  
  async function pollTaskOutput(task: Task) {
    try {
      const lastLine = taskOutputCache.get(task.id) || 0;
      const response = await fetch(`/api/tasks/output/${task.id}?lastLine=${lastLine}`);
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.output && data.output.length > 0) {
          data.output.forEach((line: string) => {
            taskStore.appendOutput(task.id, line);
          });
          taskOutputCache.set(task.id, lastLine + data.output.length);
          
          if (autoScroll && $activeTask?.id === task.id) {
            scrollToBottom();
          }
        }
        
        if (data.completed) {
          taskStore.stopTask(task.id, data.exitCode || 0);
          taskOutputCache.delete(task.id);
        }
      }
    } catch (error) {
      console.error('[TaskRunner] Error polling task output:', error);
    }
  }
  
  async function loadPackageScripts() {
    try {
      const response = await fetch('/api/tasks/npm-scripts');
      if (response.ok) {
        const scripts = await response.json();
        taskStore.loadNpmScripts(scripts);
      }
    } catch (error) {
      console.error('[TaskRunner] Failed to load npm scripts:', error);
    }
  }
  
  async function runTask(command: string, name: string, type: 'npm' | 'make' | 'custom' = 'custom') {
    const taskId = taskStore.addTask(name, command, type);
    taskStore.setActiveTask(taskId);
    
    try {
      const response = await fetch('/api/tasks/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, command })
      });
      
      if (!response.ok) {
        throw new Error('Failed to start task');
      }
    } catch (error) {
      console.error('[TaskRunner] Failed to run task:', error);
      taskStore.appendOutput(taskId, `Failed to start task: ${error}`);
      taskStore.stopTask(taskId, 1);
    }
  }
  
  async function stopTask(task: Task) {
    if (!task.pid) return;
    
    try {
      await fetch('/api/tasks/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pid: task.pid })
      });
    } catch (error) {
      console.error('[TaskRunner] Failed to stop task:', error);
    }
  }
  
  function addCustomTask() {
    if (!commandInput.trim() || !nameInput.trim()) return;
    
    taskStore.addPreset({
      name: nameInput,
      command: commandInput,
      type: 'custom'
    });
    
    commandInput = '';
    nameInput = '';
    showAddTask = false;
  }
  
  function selectTask(task: Task) {
    taskStore.setActiveTask(task.id);
  }
  
  function clearTask(task: Task) {
    if (task.running) {
      if (!confirm('This task is still running. Stop and remove it?')) return;
      stopTask(task);
    }
    taskStore.removeTask(task.id);
  }
  
  async function scrollToBottom() {
    await tick();
    if (outputContainer) {
      outputContainer.scrollTop = outputContainer.scrollHeight;
    }
  }
  
  function formatDuration(start: Date, end: Date | null): string {
    const duration = (end || new Date()).getTime() - start.getTime();
    const seconds = Math.floor(duration / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }
  
  function getTaskIcon(task: Task) {
    if (task.running) return Square;
    if (task.exitCode === 0) return CheckCircle;
    if (task.exitCode !== null) return XCircle;
    return Play;
  }
  
  function getTaskClass(task: Task) {
    if (task.running) return 'running';
    if (task.exitCode === 0) return 'success';
    if (task.exitCode !== null) return 'error';
    return '';
  }
  
  $: completedTasks = $taskStore.tasks.filter(t => !t.running && t.endTime);
  $: if ($activeTask && autoScroll) {
    scrollToBottom();
  }
</script>

<div class="task-runner-container">
  <div class="panel-layout">
    <div class="sidebar">
      <div class="sidebar-header">
        <h3>Tasks</h3>
        <button 
          class="icon-button"
          on:click={loadPackageScripts}
          title="Refresh npm scripts"
        >
          <RefreshCw size={16} />
        </button>
      </div>
      
      <div class="task-sections">
        <!-- NPM Scripts -->
        {#if $npmScripts.length > 0}
          <div class="section">
            <button 
              class="section-header"
              on:click={() => expandedSections.npm = !expandedSections.npm}
            >
              {#if expandedSections.npm}
                <ChevronDown size={16} />
              {:else}
                <ChevronRight size={16} />
              {/if}
              <Package size={16} />
              NPM Scripts
              <span class="count">{$npmScripts.length}</span>
            </button>
            
            {#if expandedSections.npm}
              <div class="task-list">
                {#each $npmScripts as preset}
                  <button 
                    class="task-item"
                    on:click={() => runTask(preset.command, preset.name, preset.type)}
                    title={preset.description}
                  >
                    <Play size={14} />
                    <span class="task-name">{preset.name.replace('npm run ', '')}</span>
                  </button>
                {/each}
              </div>
            {/if}
          </div>
        {/if}
        
        <!-- Custom Tasks -->
        <div class="section">
          <button 
            class="section-header"
            on:click={() => expandedSections.custom = !expandedSections.custom}
          >
            {#if expandedSections.custom}
              <ChevronDown size={16} />
            {:else}
              <ChevronRight size={16} />
            {/if}
            <Zap size={16} />
            Custom Tasks
            <span class="count">{$customPresets.length}</span>
          </button>
          
          {#if expandedSections.custom}
            <div class="task-list">
              {#each $customPresets as preset}
                <div class="task-item with-actions">
                  <button 
                    class="task-button"
                    on:click={() => runTask(preset.command, preset.name, preset.type)}
                  >
                    <Play size={14} />
                    <span class="task-name">{preset.name}</span>
                  </button>
                  <button 
                    class="delete-button"
                    on:click={() => taskStore.removePreset(preset.id)}
                  >
                    <X size={14} />
                  </button>
                </div>
              {/each}
              
              {#if showAddTask}
                <div class="add-task-form">
                  <input
                    type="text"
                    placeholder="Task name"
                    bind:value={nameInput}
                    on:keydown={(e) => e.key === 'Enter' && addCustomTask()}
                  />
                  <input
                    type="text"
                    placeholder="Command"
                    bind:value={commandInput}
                    on:keydown={(e) => e.key === 'Enter' && addCustomTask()}
                  />
                  <div class="form-actions">
                    <button class="save-button" on:click={addCustomTask}>
                      <Save size={14} />
                    </button>
                    <button class="cancel-button" on:click={() => showAddTask = false}>
                      <X size={14} />
                    </button>
                  </div>
                </div>
              {:else}
                <button class="add-button" on:click={() => showAddTask = true}>
                  <Plus size={14} />
                  Add Task
                </button>
              {/if}
            </div>
          {/if}
        </div>
        
        <!-- Running Tasks -->
        {#if $runningTasks.length > 0}
          <div class="section">
            <button 
              class="section-header"
              on:click={() => expandedSections.running = !expandedSections.running}
            >
              {#if expandedSections.running}
                <ChevronDown size={16} />
              {:else}
                <ChevronRight size={16} />
              {/if}
              <Terminal size={16} />
              Running
              <span class="count running">{$runningTasks.length}</span>
            </button>
            
            {#if expandedSections.running}
              <div class="task-list">
                {#each $runningTasks as task}
                  <button 
                    class="task-status-item {getTaskClass(task)}"
                    class:active={$activeTask?.id === task.id}
                    on:click={() => selectTask(task)}
                  >
                    <svelte:component this={getTaskIcon(task)} size={14} />
                    <span class="task-name">{task.name}</span>
                    {#if task.startTime}
                      <span class="duration">{formatDuration(task.startTime, null)}</span>
                    {/if}
                  </button>
                {/each}
              </div>
            {/if}
          </div>
        {/if}
        
        <!-- Completed Tasks -->
        {#if completedTasks.length > 0}
          <div class="section">
            <button 
              class="section-header"
              on:click={() => expandedSections.completed = !expandedSections.completed}
            >
              {#if expandedSections.completed}
                <ChevronDown size={16} />
              {:else}
                <ChevronRight size={16} />
              {/if}
              <Clock size={16} />
              History
              <span class="count">{completedTasks.length}</span>
            </button>
            
            {#if expandedSections.completed}
              <div class="task-list">
                {#each completedTasks as task}
                  <button 
                    class="task-status-item {getTaskClass(task)}"
                    class:active={$activeTask?.id === task.id}
                    on:click={() => selectTask(task)}
                  >
                    <svelte:component this={getTaskIcon(task)} size={14} />
                    <span class="task-name">{task.name}</span>
                    {#if task.startTime && task.endTime}
                      <span class="duration">{formatDuration(task.startTime, task.endTime)}</span>
                    {/if}
                  </button>
                {/each}
              </div>
            {/if}
          </div>
        {/if}
      </div>
    </div>
    
    <div class="main-content">
      {#if $activeTask}
        <div class="output-header">
          <div class="task-info">
            <h3>{$activeTask.name}</h3>
            <code class="command">{$activeTask.command}</code>
          </div>
          <div class="output-controls">
            <label class="auto-scroll">
              <input type="checkbox" bind:checked={autoScroll} />
              Auto-scroll
            </label>
            {#if $activeTask.running}
              <button 
                class="stop-button"
                on:click={() => stopTask($activeTask)}
              >
                <Square size={16} />
                Stop
              </button>
            {:else}
              <button 
                class="rerun-button"
                on:click={() => runTask($activeTask.command, $activeTask.name, $activeTask.type)}
              >
                <RefreshCw size={16} />
                Re-run
              </button>
            {/if}
            <button 
              class="clear-button"
              on:click={() => clearTask($activeTask)}
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
        
        <div class="output-container" bind:this={outputContainer}>
          {#each $activeTask.output as line}
            <div class="output-line">{line}</div>
          {/each}
          
          {#if $activeTask.endTime}
            <div class="output-status {getTaskClass($activeTask)}">
              {#if $activeTask.exitCode === 0}
                Task completed successfully
              {:else}
                Task failed with exit code {$activeTask.exitCode}
              {/if}
              {#if $activeTask.startTime}({formatDuration($activeTask.startTime, $activeTask.endTime)}){/if}
            </div>
          {/if}
        </div>
      {:else}
        <div class="empty-state">
          <Terminal size={48} />
          <p>Select a task to view output</p>
          <p class="hint">Choose from npm scripts or create custom tasks</p>
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  .task-runner-container {
    display: flex;
    flex-direction: column;
    height: 100%;
    background-color: var(--bg-color, #2d2d30);
    color: var(--text-color, #cccccc);
  }
  
  .panel-layout {
    display: flex;
    height: 100%;
  }
  
  .sidebar {
    width: 280px;
    border-right: 1px solid var(--border-color, #3e3e42);
    display: flex;
    flex-direction: column;
  }
  
  .sidebar-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    border-bottom: 1px solid var(--border-color, #3e3e42);
  }
  
  .sidebar-header h3 {
    margin: 0;
    font-size: 16px;
    color: var(--panel-title-color, rgb(210, 210, 210));
  }
  
  .icon-button {
    background: none;
    border: none;
    color: var(--text-color, #cccccc);
    padding: 4px;
    border-radius: 4px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .icon-button:hover {
    background-color: rgba(255, 255, 255, 0.1);
  }
  
  .task-sections {
    flex: 1;
    overflow-y: auto;
  }
  
  .section {
    border-bottom: 1px solid var(--border-color, #3e3e42);
  }
  
  .section-header {
    width: 100%;
    background: none;
    border: none;
    color: var(--text-color, #cccccc);
    padding: 10px 16px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    text-align: left;
  }
  
  .section-header:hover {
    background-color: rgba(255, 255, 255, 0.05);
  }
  
  .count {
    margin-left: auto;
    background-color: rgba(255, 255, 255, 0.1);
    padding: 2px 6px;
    border-radius: 10px;
    font-size: 11px;
  }
  
  .count.running {
    background-color: var(--accent-color, #007acc);
    color: white;
  }
  
  .task-list {
    padding: 8px;
  }
  
  .task-item {
    width: 100%;
    background: none;
    border: 1px solid transparent;
    color: var(--text-color, #cccccc);
    padding: 6px 10px;
    border-radius: 4px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    text-align: left;
    margin-bottom: 4px;
  }
  
  .task-item:hover {
    background-color: rgba(255, 255, 255, 0.05);
    border-color: var(--border-color, #3e3e42);
  }
  
  .task-item.with-actions {
    display: flex;
    gap: 4px;
  }
  
  .task-button {
    flex: 1;
    background: none;
    border: 1px solid transparent;
    color: var(--text-color, #cccccc);
    padding: 6px 10px;
    border-radius: 4px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    text-align: left;
  }
  
  .task-button:hover {
    background-color: rgba(255, 255, 255, 0.05);
    border-color: var(--border-color, #3e3e42);
  }
  
  .delete-button {
    background: none;
    border: 1px solid transparent;
    color: var(--text-secondary, #858585);
    padding: 6px;
    border-radius: 4px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .delete-button:hover {
    background-color: rgba(220, 53, 69, 0.2);
    border-color: #dc3545;
    color: #dc3545;
  }
  
  .task-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  
  .duration {
    margin-left: auto;
    font-size: 11px;
    color: var(--text-secondary, #858585);
  }
  
  .task-status-item {
    width: 100%;
    background: none;
    border: 1px solid var(--border-color, #3e3e42);
    color: var(--text-color, #cccccc);
    padding: 6px 10px;
    border-radius: 4px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    text-align: left;
    margin-bottom: 4px;
  }
  
  .task-status-item:hover {
    background-color: rgba(255, 255, 255, 0.05);
  }
  
  .task-status-item.active {
    background-color: var(--accent-color, #007acc);
    color: white;
    border-color: var(--accent-color, #007acc);
  }
  
  .task-status-item.running {
    border-color: var(--accent-color, #007acc);
  }
  
  .task-status-item.success {
    border-color: #28a745;
  }
  
  .task-status-item.error {
    border-color: #dc3545;
  }
  
  .add-button {
    width: 100%;
    background: none;
    border: 1px dashed var(--border-color, #3e3e42);
    color: var(--text-color, #cccccc);
    padding: 8px;
    border-radius: 4px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    font-size: 13px;
  }
  
  .add-button:hover {
    background-color: rgba(255, 255, 255, 0.05);
  }
  
  .add-task-form {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 8px;
    background-color: var(--input-bg, #3c3c3c);
    border-radius: 4px;
  }
  
  .add-task-form input {
    background-color: var(--bg-color, #2d2d30);
    color: var(--text-color, #cccccc);
    border: 1px solid var(--border-color, #3e3e42);
    padding: 6px;
    border-radius: 4px;
    font-size: 13px;
  }
  
  .add-task-form input:focus {
    outline: none;
    border-color: var(--accent-color, #007acc);
  }
  
  .form-actions {
    display: flex;
    gap: 4px;
    justify-content: flex-end;
  }
  
  .save-button, .cancel-button {
    background: none;
    border: 1px solid var(--border-color, #3e3e42);
    color: var(--text-color, #cccccc);
    padding: 4px 8px;
    border-radius: 4px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 4px;
  }
  
  .save-button:hover {
    background-color: var(--accent-color, #007acc);
    color: white;
    border-color: var(--accent-color, #007acc);
  }
  
  .cancel-button:hover {
    background-color: rgba(220, 53, 69, 0.2);
    border-color: #dc3545;
    color: #dc3545;
  }
  
  .main-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    background-color: var(--bg-color, #2d2d30);
  }
  
  .output-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    border-bottom: 1px solid var(--border-color, #3e3e42);
    background-color: var(--bg-color, #2d2d30);
  }
  
  .task-info h3 {
    margin: 0 0 4px 0;
    font-size: 16px;
    color: var(--panel-title-color, rgb(210, 210, 210));
  }
  
  .command {
    font-family: monospace;
    font-size: 12px;
    color: var(--text-secondary, #858585);
    background-color: rgba(255, 255, 255, 0.05);
    padding: 2px 6px;
    border-radius: 4px;
  }
  
  .output-controls {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  
  .auto-scroll {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: var(--text-secondary, #858585);
  }
  
  .auto-scroll input[type="checkbox"] {
    margin: 0;
  }
  
  .stop-button, .rerun-button, .clear-button {
    background: none;
    border: 1px solid var(--border-color, #3e3e42);
    color: var(--text-color, #cccccc);
    padding: 6px 12px;
    border-radius: 4px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
  }
  
  .stop-button:hover {
    background-color: rgba(220, 53, 69, 0.2);
    border-color: #dc3545;
    color: #dc3545;
  }
  
  .rerun-button:hover {
    background-color: rgba(40, 167, 69, 0.2);
    border-color: #28a745;
    color: #28a745;
  }
  
  .clear-button:hover {
    background-color: rgba(220, 53, 69, 0.2);
    border-color: #dc3545;
    color: #dc3545;
  }
  
  .output-container {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
    font-family: monospace;
    font-size: 13px;
    line-height: 1.4;
    background-color: var(--bg-color, #2d2d30);
  }
  
  .output-line {
    white-space: pre-wrap;
    word-break: break-all;
  }
  
  .output-status {
    margin-top: 16px;
    padding: 8px 12px;
    border-radius: 4px;
    font-family: sans-serif;
    font-size: 13px;
  }
  
  .output-status.success {
    background-color: rgba(40, 167, 69, 0.2);
    color: #28a745;
    border: 1px solid #28a745;
  }
  
  .output-status.error {
    background-color: rgba(220, 53, 69, 0.2);
    color: #dc3545;
    border: 1px solid #dc3545;
  }
  
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: var(--text-secondary, #858585);
    background-color: var(--bg-color, #2d2d30);
  }
  
  .empty-state p {
    margin: 8px 0;
    font-size: 14px;
  }
  
  .hint {
    font-size: 13px;
  }
</style>