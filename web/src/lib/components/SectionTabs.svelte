<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import { writable } from 'svelte/store';
  
  const dispatch = createEventDispatcher();
  
  interface Section {
    id: string;
    name: string;
    scrollPosition: number;
  }
  
  // Section management
  let sections = writable<Section[]>([
    { id: 'section-1', name: 'Section 1', scrollPosition: 0 }
  ]);
  
  let activeSection = 'section-1';
  let editingSection: string | null = null;
  let editingName = '';
  let scrollContainer: HTMLElement | null = null;
  
  // Add new section
  function addSection() {
    const layoutContainer = document.querySelector('.row-layout') as HTMLElement;
    const newSection: Section = {
      id: `section-${Date.now()}`,
      name: `Section ${$sections.length + 1}`,
      scrollPosition: layoutContainer ? layoutContainer.scrollTop + window.innerHeight : 0
    };
    
    $sections = [...$sections, newSection];
    scrollToSection(newSection.id);
  }
  
  // Scroll to section
  function scrollToSection(sectionId: string) {
    const section = $sections.find(s => s.id === sectionId);
    if (!section) return;
    
    activeSection = sectionId;
    
    // Find the layout container
    const layoutContainer = document.querySelector('.row-layout') as HTMLElement;
    if (layoutContainer) {
      layoutContainer.scrollTo({
        top: section.scrollPosition,
        behavior: 'smooth'
      });
    }
  }
  
  // Start editing section name
  function startEditing(sectionId: string) {
    const section = $sections.find(s => s.id === sectionId);
    if (!section) return;
    
    editingSection = sectionId;
    editingName = section.name;
  }
  
  // Save section name
  function saveSectionName() {
    if (!editingSection) return;
    
    $sections = $sections.map(section => 
      section.id === editingSection 
        ? { ...section, name: editingName.trim() || 'Untitled' }
        : section
    );
    
    editingSection = null;
    editingName = '';
  }
  
  // Cancel editing
  function cancelEditing() {
    editingSection = null;
    editingName = '';
  }
  
  // Delete section
  function deleteSection(sectionId: string) {
    // Don't delete if it's the last section
    if ($sections.length <= 1) return;
    
    $sections = $sections.filter(s => s.id !== sectionId);
    
    // If active section was deleted, switch to first
    if (activeSection === sectionId && $sections.length > 0) {
      scrollToSection($sections[0].id);
    }
  }
  
  // Auto-detect when content goes below fold
  function checkContentHeight() {
    const layoutContainer = document.querySelector('.row-layout') as HTMLElement;
    if (!layoutContainer) return;
    
    const contentHeight = layoutContainer.scrollHeight;
    const viewportHeight = window.innerHeight;
    const containerTop = layoutContainer.offsetTop;
    const effectiveViewportHeight = viewportHeight - containerTop;
    
    const lastSection = $sections[$sections.length - 1];
    
    // If content extends beyond last section's position + viewport, add new section
    if (contentHeight > lastSection.scrollPosition + effectiveViewportHeight) {
      const newSection: Section = {
        id: `section-${Date.now()}`,
        name: `Section ${$sections.length + 1}`,
        scrollPosition: lastSection.scrollPosition + effectiveViewportHeight
      };
      
      $sections = [...$sections, newSection];
      console.log('New section added:', newSection);
    }
  }
  
  // Update active section based on scroll position
  function updateActiveSection() {
    const layoutContainer = document.querySelector('.row-layout');
    if (!layoutContainer) return;
    
    const currentScroll = layoutContainer.scrollTop;
    
    // Find the section closest to current scroll position
    let closestSection = $sections[0];
    let minDistance = Math.abs(currentScroll - closestSection.scrollPosition);
    
    for (const section of $sections) {
      const distance = Math.abs(currentScroll - section.scrollPosition);
      if (distance < minDistance) {
        minDistance = distance;
        closestSection = section;
      }
    }
    
    activeSection = closestSection.id;
  }
  
  onMount(() => {
    // Set up scroll listener
    const layoutContainer = document.querySelector('.row-layout');
    if (layoutContainer) {
      layoutContainer.addEventListener('scroll', updateActiveSection);
      
      // Check content height periodically
      const interval = setInterval(checkContentHeight, 1000);
      
      return () => {
        layoutContainer.removeEventListener('scroll', updateActiveSection);
        clearInterval(interval);
      };
    }
  });
</script>

<div class="section-tabs">
  <div class="tabs-container">
    {#each $sections as section (section.id)}
      <div 
        class="tab"
        class:active={section.id === activeSection}
        on:click={() => scrollToSection(section.id)}
        role="button"
        tabindex="0"
        on:keydown={(e) => e.key === 'Enter' && scrollToSection(section.id)}
      >
        {#if editingSection === section.id}
          <input
            type="text"
            class="tab-name-input"
            bind:value={editingName}
            on:blur={saveSectionName}
            on:keydown={(e) => {
              if (e.key === 'Enter') saveSectionName();
              if (e.key === 'Escape') cancelEditing();
            }}
            autofocus
          />
        {:else}
          <span 
            class="tab-name"
            on:dblclick={() => startEditing(section.id)}
            title="Double-click to rename"
          >
            {section.name}
          </span>
        {/if}
        
        {#if $sections.length > 1}
          <button 
            class="tab-close"
            on:click|stopPropagation={() => deleteSection(section.id)}
            title="Delete section"
          >
            ×
          </button>
        {/if}
      </div>
    {/each}
    
    <button 
      class="add-tab"
      on:click={addSection}
      title="Add new section"
    >
      <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
        <path d="M6.5 1.5h-1v4h-4v1h4v4h1v-4h4v-1h-4v-4z"/>
      </svg>
    </button>
    
    <!-- Panel Manager Slot -->
    <div class="panel-manager-slot">
      <slot name="panel-manager" />
    </div>
  </div>
</div>

<style>
  .section-tabs {
    background-color: var(--bg-secondary, #252526);
    border-bottom: 1px solid var(--panel-border, #3e3e42);
    padding: 0 8px;
    overflow: visible; /* Allow dropdown to show */
    position: sticky;
    top: 0;
    z-index: 100;
  }
  
  .tabs-container {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 40px;
    overflow-x: auto;
    overflow-y: hidden;
    scrollbar-width: none;
    -ms-overflow-style: none;
    width: 100%;
    /* Enable smooth touch scrolling */
    -webkit-overflow-scrolling: touch;
    scroll-snap-type: x proximity;
    /* Add visual scroll indicators on hover */
    position: relative;
  }
  
  .tabs-container::-webkit-scrollbar {
    display: none;
  }
  
  .tab {
    position: relative;
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-sm) var(--spacing-md);
    background-color: transparent;
    border: none;
    color: var(--text-secondary, #858585);
    cursor: pointer;
    white-space: nowrap;
    border-radius: 4px 4px 0 0;
    transition: all 0.2s;
    min-width: 0;
    flex-shrink: 0;
    border-bottom: 2px solid transparent;
    /* Improve touch targets */
    min-height: var(--touch-target-min);
    scroll-snap-align: start;
    /* Prevent text selection on touch */
    -webkit-touch-callout: none;
    -webkit-user-select: none;
    user-select: none;
  }
  
  .tab:hover {
    background-color: var(--bg-tertiary, #2d2d30);
    color: var(--text-primary, #d4d4d4);
  }
  
  .tab.active {
    background-color: var(--bg-primary, #1e1e1e);
    color: var(--text-primary, #d4d4d4);
    border-bottom-color: var(--accent-color, #0e639c);
  }
  
  .tab-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 120px;
    font-size: var(--font-size-sm);
    font-weight: 500;
    user-select: none;
  }
  
  .tab-name-input {
    background: var(--bg-tertiary, #2d2d30);
    border: 1px solid var(--accent-color, #0e639c);
    border-radius: 3px;
    color: var(--text-primary, #d4d4d4);
    font-size: 13px;
    padding: 2px 6px;
    width: 100px;
    outline: none;
  }
  
  .tab-close {
    display: none;
    background: none;
    border: none;
    color: var(--text-secondary, #858585);
    cursor: pointer;
    padding: 2px;
    border-radius: 3px;
    font-size: 16px;
    line-height: 1;
    width: 20px;
    height: 20px;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
  }
  
  .tab:hover .tab-close {
    display: flex;
  }
  
  .tab-close:hover {
    background-color: var(--bg-danger-hover, #5a1d1d);
    color: var(--text-danger, #f48771);
  }
  
  .add-tab {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    background: none;
    border: 1px dashed var(--panel-border, #3e3e42);
    color: var(--text-secondary, #858585);
    cursor: pointer;
    border-radius: 4px;
    margin-left: 8px;
    transition: all 0.2s;
    flex-shrink: 0;
  }
  
  .add-tab:hover {
    background-color: var(--bg-tertiary, #2d2d30);
    border-color: var(--accent-color, #0e639c);
    color: var(--accent-color, #0e639c);
  }
  
  .panel-manager-slot {
    margin-left: auto;
    padding-left: 16px;
    flex-shrink: 0;
    position: relative; /* For dropdown positioning */
  }
  
  /* Touch-friendly adjustments */
  @media (pointer: coarse) {
    .tab {
      /* Larger touch targets */
      min-height: 44px;
      padding: var(--spacing-sm) var(--spacing-md);
    }
    
    .tab-close {
      /* Always show close button on touch devices */
      display: flex !important;
      width: 32px;
      height: 32px;
      font-size: 18px;
    }
    
    .add-tab {
      width: 44px;
      height: 36px;
    }
  }
  
  /* Container queries for responsive tabs */
  @container (max-width: 600px) {
    .tabs-container {
      height: 36px;
    }
    
    .tab {
      padding: var(--spacing-xs) var(--spacing-sm);
      gap: var(--spacing-xs);
    }
    
    .tab-name {
      max-width: 60px;
      font-size: var(--font-size-xs);
    }
    
    .panel-manager-slot {
      padding-left: var(--spacing-sm);
    }
  }
  
  /* Viewport-based responsive */
  @media (max-width: 768px) {
    .section-tabs {
      padding: 0 var(--spacing-xs);
    }
    
    .tabs-container {
      height: 38px;
      /* Add scroll shadows */
      background: 
        linear-gradient(to right, var(--bg-secondary) 20px, transparent 20px),
        linear-gradient(to left, var(--bg-secondary) 20px, transparent 20px),
        linear-gradient(to right, rgba(0,0,0,0.15), transparent 20px),
        linear-gradient(to left, rgba(0,0,0,0.15), transparent 20px);
      background-attachment: local, local, scroll, scroll;
      background-position: 0 0, 100% 0, 0 0, 100% 0;
      background-repeat: no-repeat;
      background-size: 20px 100%, 20px 100%, 10px 100%, 10px 100%;
    }
    
    .tab-name {
      max-width: 80px;
    }
    
    .tab {
      padding: var(--spacing-xs) var(--spacing-sm);
    }
    
    .add-tab {
      width: 32px;
      height: 32px;
      margin-left: var(--spacing-xs);
    }
    
    /* Show visual scroll indicator */
    .tabs-container::after {
      content: '';
      position: absolute;
      right: 0;
      top: 50%;
      transform: translateY(-50%);
      width: 20px;
      height: 80%;
      background: linear-gradient(to right, transparent, var(--bg-secondary));
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.3s;
    }
    
    .tabs-container:hover::after {
      opacity: 1;
    }
  }
  
  /* High contrast mode support */
  @media (prefers-contrast: high) {
    .tab {
      border: 1px solid transparent;
    }
    
    .tab:hover,
    .tab:focus {
      border-color: var(--text-secondary);
    }
    
    .tab.active {
      border-color: var(--accent-color);
    }
  }
</style>