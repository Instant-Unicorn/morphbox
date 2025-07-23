<script lang="ts">
  export let code: string = '';
  export let language: string = 'typescript';
</script>

<pre class="code-block"><code class="language-{language}">{code}</code></pre>

<style>
  .code-block {
    background-color: var(--bg-secondary, #1e1e1e);
    border: 1px solid var(--border-color, #3e3e42);
    border-radius: 4px;
    padding: 16px;
    margin: 16px 0;
    overflow-x: auto;
  }

  code {
    color: var(--text-primary, #d4d4d4);
    font-family: 'Cascadia Code', 'Fira Code', monospace;
    font-size: 14px;
    line-height: 1.5;
  }
</style>