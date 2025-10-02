<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { X } from 'lucide-svelte';
  import type { PromptMode } from './prompt-queue-store';

  export let mode: Partial<PromptMode> | null = null;
  export let isOpen = false;

  const dispatch = createEventDispatcher();

  // Simple emoji options
  const EMOJI_OPTIONS = ['💯', '💡', '🎯', '🚀', '⚡', '🔥', '✨', '🎨'];

  // Color presets
  const COLOR_PRESETS = [
    '#ff6b6b', // Red
    '#4ecdc4', // Teal
    '#45b7d1', // Blue
    '#f7b731', // Yellow
    '#5f27cd', // Purple
    '#00d2d3', // Cyan
    '#ff9ff3', // Pink
    '#54a0ff'  // Light Blue
  ];

  let name = mode?.name || '';
  let instruction = mode?.instruction || '';
  let emoji = mode?.emoji || '💡';
  let color = mode?.color || '#4ecdc4';
  let isGlobal = mode?.isGlobal ?? true;

  function handleSave() {
    if (!name.trim() || !instruction.trim()) {
      return;
    }

    const modeData: Omit<PromptMode, 'id'> = {
      name: name.trim(),
      instruction: instruction.trim(),
      emoji,
      color,
      isGlobal,
      enabled: mode?.enabled ?? false
    };

    dispatch('save', { mode: modeData, id: mode?.id });
    handleClose();
  }

  function handleClose() {
    dispatch('close');
  }

  function handleBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      handleClose();
    }
  }
</script>

{#if isOpen}
  <div class="modal-backdrop" on:click={handleBackdropClick} role="presentation">
    <div class="modal-content" role="dialog" aria-labelledby="modal-title">
      <div class="modal-header">
        <h2 id="modal-title">{mode?.id ? 'Edit' : 'Create'} Prompt Mode</h2>
        <button class="close-btn" on:click={handleClose} aria-label="Close modal">
          <X size={20} />
        </button>
      </div>

      <div class="modal-body">
        <!-- Name Input -->
        <div class="form-group">
          <label for="mode-name">
            Mode Name
            <span class="required">*</span>
          </label>
          <input
            id="mode-name"
            type="text"
            bind:value={name}
            placeholder="e.g., Brutal Honesty"
            maxlength="30"
          />
        </div>

        <!-- Instruction Input -->
        <div class="form-group">
          <label for="mode-instruction">
            Instruction
            <span class="required">*</span>
            <span class="hint">This will be appended to prompts</span>
          </label>
          <textarea
            id="mode-instruction"
            bind:value={instruction}
            placeholder="e.g., Be brutally honest."
            rows="3"
            maxlength="200"
          />
          <div class="char-count">{instruction.length}/200</div>
        </div>

        <!-- Emoji Selector -->
        <div class="form-group">
          <label>Icon</label>
          <div class="emoji-grid">
            {#each EMOJI_OPTIONS as emojiOption}
              <button
                class="emoji-option"
                class:selected={emoji === emojiOption}
                on:click={() => emoji = emojiOption}
                type="button"
              >
                {emojiOption}
              </button>
            {/each}
          </div>
        </div>

        <!-- Color Picker -->
        <div class="form-group">
          <label>Color</label>
          <div class="color-picker">
            <div class="color-grid">
              {#each COLOR_PRESETS as colorOption}
                <button
                  class="color-option"
                  class:selected={color === colorOption}
                  style="background-color: {colorOption}"
                  on:click={() => color = colorOption}
                  type="button"
                  aria-label="Select color {colorOption}"
                />
              {/each}
            </div>
            <input
              type="color"
              bind:value={color}
              class="color-input"
              aria-label="Custom color picker"
            />
          </div>
        </div>

        <!-- Mode Type -->
        <div class="form-group">
          <label class="checkbox-label">
            <input type="checkbox" bind:checked={isGlobal} />
            <span>Global Mode (applies to all prompts by default)</span>
          </label>
        </div>

        <!-- Preview -->
        <div class="preview-section">
          <label>Preview</label>
          <div class="mode-preview">
            <span class="mode-badge" style="background-color: {color}">
              <span class="mode-emoji">{emoji}</span>
              <span class="mode-name">{name || 'Mode Name'}</span>
            </span>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn btn-secondary" on:click={handleClose}>
          Cancel
        </button>
        <button
          class="btn btn-primary"
          on:click={handleSave}
          disabled={!name.trim() || !instruction.trim()}
        >
          {mode?.id ? 'Save Changes' : 'Create Mode'}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    backdrop-filter: blur(2px);
  }

  .modal-content {
    background: var(--bg-primary, #1e1e1e);
    border-radius: 8px;
    width: 90%;
    max-width: 500px;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
    border: 1px solid var(--border-color, #3e3e42);
  }

  .modal-header {
    padding: 20px;
    border-bottom: 1px solid var(--border-color, #3e3e42);
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .modal-header h2 {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: var(--text-primary, #e4e4e4);
  }

  .close-btn {
    background: transparent;
    border: none;
    color: var(--text-secondary, #858585);
    cursor: pointer;
    padding: 4px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .close-btn:hover {
    background: var(--hover-bg, rgba(255, 255, 255, 0.1));
    color: var(--text-primary, #e4e4e4);
  }

  .modal-body {
    padding: 20px;
    overflow-y: auto;
    flex: 1;
  }

  .form-group {
    margin-bottom: 20px;
  }

  .form-group label {
    display: block;
    margin-bottom: 8px;
    font-size: 13px;
    font-weight: 500;
    color: var(--text-primary, #e4e4e4);
  }

  .required {
    color: #ff6b6b;
  }

  .hint {
    font-size: 11px;
    font-weight: 400;
    color: var(--text-secondary, #858585);
    margin-left: 8px;
  }

  input[type="text"],
  textarea {
    width: 100%;
    padding: 10px 12px;
    background: var(--input-bg, #2d2d30);
    border: 1px solid var(--border-color, #3e3e42);
    border-radius: 4px;
    color: var(--text-primary, #e4e4e4);
    font-size: 13px;
    font-family: inherit;
    resize: vertical;
  }

  input[type="text"]:focus,
  textarea:focus {
    outline: none;
    border-color: var(--accent-color, #0e639c);
  }

  .char-count {
    text-align: right;
    font-size: 11px;
    color: var(--text-secondary, #858585);
    margin-top: 4px;
  }

  .emoji-grid {
    display: grid;
    grid-template-columns: repeat(8, 1fr);
    gap: 8px;
  }

  .emoji-option {
    background: var(--input-bg, #2d2d30);
    border: 2px solid var(--border-color, #3e3e42);
    border-radius: 8px;
    padding: 12px;
    font-size: 24px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .emoji-option:hover {
    border-color: var(--accent-color, #0e639c);
    transform: scale(1.1);
  }

  .emoji-option.selected {
    border-color: var(--accent-color, #0e639c);
    background: var(--accent-color-alpha, rgba(14, 99, 156, 0.2));
  }

  .color-picker {
    display: flex;
    gap: 12px;
    align-items: center;
  }

  .color-grid {
    display: grid;
    grid-template-columns: repeat(8, 1fr);
    gap: 8px;
    flex: 1;
  }

  .color-option {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    border: 2px solid transparent;
    cursor: pointer;
    transition: all 0.2s;
  }

  .color-option:hover {
    transform: scale(1.15);
    border-color: var(--text-primary, #e4e4e4);
  }

  .color-option.selected {
    border-color: var(--text-primary, #e4e4e4);
    box-shadow: 0 0 0 2px var(--bg-primary, #1e1e1e);
  }

  .color-input {
    width: 50px;
    height: 32px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }

  .checkbox-label {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
  }

  .checkbox-label input[type="checkbox"] {
    width: 18px;
    height: 18px;
    cursor: pointer;
  }

  .preview-section {
    margin-top: 24px;
    padding-top: 20px;
    border-top: 1px solid var(--border-color, #3e3e42);
  }

  .mode-preview {
    margin-top: 12px;
  }

  .mode-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    border-radius: 16px;
    font-size: 13px;
    font-weight: 500;
    color: white;
  }

  .mode-emoji {
    font-size: 16px;
  }

  .modal-footer {
    padding: 16px 20px;
    border-top: 1px solid var(--border-color, #3e3e42);
    display: flex;
    justify-content: flex-end;
    gap: 12px;
  }

  .btn {
    padding: 8px 16px;
    border-radius: 4px;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    border: none;
  }

  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn-secondary {
    background: transparent;
    border: 1px solid var(--border-color, #3e3e42);
    color: var(--text-primary, #e4e4e4);
  }

  .btn-secondary:hover:not(:disabled) {
    background: var(--hover-bg, rgba(255, 255, 255, 0.1));
  }

  .btn-primary {
    background: var(--accent-color, #0e639c);
    color: white;
  }

  .btn-primary:hover:not(:disabled) {
    background: var(--accent-color-hover, #0d5a8a);
  }
</style>
