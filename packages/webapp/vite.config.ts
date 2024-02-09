import process from 'node:process';
import { defineConfig } from 'vite';

// Expose environment variables to the client
process.env.VITE_BACKEND_API_URI = process.env.BACKEND_API_URI ?? '';
console.log(`Using chat API base URL: "${process.env.VITE_BACKEND_API_URI}"`);

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
      '/chat': 'http://127.0.0.1:3000',
    },
  },
});
