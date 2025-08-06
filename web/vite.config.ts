import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [sveltekit()],
  server: {
    port: parseInt(process.env.PORT || process.env.WEB_PORT || '8008'),
    strictPort: false, // Allow Vite to use next available port if default is taken
    host: true,
    hmr: {
      port: parseInt(process.env.PORT || process.env.WEB_PORT || '8008')
    }
  },
  build: {
    rollupOptions: {
      external: ['better-sqlite3', 'node-pty', 'ws']
    }
  }
});