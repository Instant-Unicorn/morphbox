import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [sveltekit()],
  server: {
    port: parseInt(process.env.PORT || process.env.WEB_PORT || '8008'),
    strictPort: false, // Allow Vite to use next available port if default is taken
    host: true
    // Let Vite handle HMR automatically based on the actual server port
  },
  build: {
    rollupOptions: {
      external: ['better-sqlite3', 'node-pty', 'ws'],
      output: {
        // Use content-based hashing for cache busting
        entryFileNames: `[name]-[hash].js`,
        chunkFileNames: `[name]-[hash].js`,
        assetFileNames: `[name]-[hash].[ext]`
      }
    },
    // Generate manifest for tracking hashes
    manifest: true,
    // Clear output directory before build
    emptyOutDir: true
  }
});