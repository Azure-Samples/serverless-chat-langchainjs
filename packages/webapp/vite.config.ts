import process from 'node:process';
import { defineConfig } from 'vite';

// Expose environment variables to the client
process.env.VITE_API_URL = process.env.API_URL ?? '';
console.log(`Using chat API base URL: "${process.env.VITE_API_URL}"`);

export default defineConfig({
  build: {
    outDir: './dist',
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        },
      },
    },
  },
  server: {
    proxy: {
      '/api': 'http://127.0.0.1:7071',
    },
  },
});
