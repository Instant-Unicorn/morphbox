<script lang="ts">
  import { browser } from '$app/environment';
</script>

<div style="background: blue; color: white; padding: 20px;">
  <h1>Test Page</h1>
  <p>This is a test to see if anything renders</p>
  {#if browser}
    <p>Browser: Yes</p>
  {:else}
    <p>Browser: No (SSR)</p>
  {/if}
</div>