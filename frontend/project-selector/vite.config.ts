import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Target is your backend API
      '/api': {
        target: 'http://localhost:7071',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),

        configure(proxy, options) {
          proxy.on('error', (error, _request, _response) => {
            console.log('error', error);
          });
          proxy.on('proxyReq', (proxyRequest, request, _response) => {
            console.log('Request sent to target:', request.method, request.url);
          });
          proxy.on('proxyRes', (proxyResponse, request, _response) => {
            console.log('Response received from target:', proxyResponse.statusCode, request.url);
          });
        },
      },
    },
  },
});
