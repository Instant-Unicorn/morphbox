<script>
  export let code = '';
  export let language = 'javascript';
</script>

<pre class="code-block language-{language}"><code>{code}</code></pre>

<style>
  .code-block {
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 4px;
    padding: 16px;
    overflow-x: auto;
    margin: 16px 0;
  }
  
  .code-block code {
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    font-size: 14px;
    line-height: 1.5;
  }
</style>