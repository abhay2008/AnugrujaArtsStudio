import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// Vite configuration dedicated for motion graphics / animejs canvas previews & standalone rendering
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.vite.html'),
      },
    },
    outDir: 'dist-vite',
  },
  server: {
    port: 3001,
    open: '/index.vite.html',
  },
});
