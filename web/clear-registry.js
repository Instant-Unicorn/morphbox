// Script to clear and reinitialize the panel registry
// Run this in the browser console if panels aren't showing

console.log('Clearing panel registry from localStorage...');
localStorage.removeItem('panel-registry');

console.log('Registry cleared. Please refresh the page to reinitialize with built-in panels.');

// Optionally, you can also clear all panels if needed:
// localStorage.removeItem('morphbox-panels');
// localStorage.removeItem('morphbox-workspaces');