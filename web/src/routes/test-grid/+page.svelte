<script lang="ts">
  import GridLayout from '$lib/GridLayout.svelte';
  
  console.log('Test grid page loaded');
</script>

<h1>Grid Layout Test</h1>

<GridLayout />

<style>
  h1 {
    position: fixed;
    top: 10px;
    left: 10px;
    z-index: 10000;
    background: red;
    color: white;
    padding: 10px;
  }
</style>