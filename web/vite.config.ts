import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [sveltekit()],
  server: {
    port: 8008,
    host: true,
    hmr: {
      port: 8008
    }
  },
  build: {
    rollupOptions: {
      external: ['better-sqlite3', 'node-pty', 'ws']
    }
  }
});