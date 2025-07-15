<script>
  import { browser } from '$app/environment';
</script>

<div style="display: flex; flex-direction: column; height: 100vh; background: #333;">
  <div style="height: 40px; background: red; color: white; padding: 10px;">
    Header - Should be visible
  </div>
  <div style="flex: 1; background: blue; color: white; padding: 10px;">
    Main content area
  </div>
  <div style="height: 22px; background: green; color: white; padding: 5px;">
    Status bar - Should be visible
  </div>
</div>