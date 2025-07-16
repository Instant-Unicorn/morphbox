// Debug script to check panel registry state
// Run this in the browser console

// Check localStorage
console.log('=== LocalStorage Panel Registry ===');
const stored = localStorage.getItem('panel-registry');
if (stored) {
  try {
    const parsed = JSON.parse(stored);
    console.log('Stored panels:', parsed);
  } catch (e) {
    console.error('Failed to parse stored registry:', e);
  }
} else {
  console.log('No panel registry in localStorage');
}

// Check if panelRegistry is available in window
console.log('\n=== Checking Panel Registry Store ===');
// This would need to be exposed from the Svelte component
console.log('To fully debug, add this to PanelManager.svelte:');
console.log(`
  import { get } from 'svelte/store';
  
  // In onMount or script
  if (typeof window !== 'undefined') {
    window.debugRegistry = () => {
      const registry = get(panelRegistry);
      console.log('Registry state:', registry);
      console.log('All panels:', panelRegistry.getAll());
      console.log('Builtin panels:', get(builtinPanels));
      console.log('Custom panels:', get(customPanels));
    };
  }
`);