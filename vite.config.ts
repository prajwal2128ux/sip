import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss()
  ],
  server: {
    port: 3000,
    host: '0.0.0.0',
    proxy: {
      '/api/winston': {
        target: 'https://api.gowinston.ai',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api\/winston/, '')
      },
      '/api/wiki': {
        target: 'https://en.wikipedia.org',
        changeOrigin: true,
        secure: true,
        headers: {
          'User-Agent': 'PlagiCheckAcademic/1.0 (academic integrity checker; contact@plagicheck.edu)'
        },
        rewrite: (path) => path.replace(/^\/api\/wiki/, '')
      }
    }
  },
  preview: {
    port: 3000,
    host: '0.0.0.0',
    proxy: {
      '/api/winston': {
        target: 'https://api.gowinston.ai',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api\/winston/, '')
      },
      '/api/wiki': {
        target: 'https://en.wikipedia.org',
        changeOrigin: true,
        secure: true,
        headers: {
          'User-Agent': 'PlagiCheckAcademic/1.0 (academic integrity checker; contact@plagicheck.edu)'
        },
        rewrite: (path) => path.replace(/^\/api\/wiki/, '')
      }
    }
  }
});
