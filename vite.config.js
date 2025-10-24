import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import safeParser from 'postcss-safe-parser';

import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    hmr: true
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react-router-dom') || id.includes('react-dom') || id.includes(`${path.sep}react${path.sep}`)) {
              return 'react-vendor';
            }

            if (
              id.includes('@chakra-ui') ||
              id.includes('@emotion') ||
              id.includes('next-themes')
            ) {
              return 'chakra-vendor';
            }

            if (id.includes('gsap') || id.includes(`${path.sep}ogl${path.sep}`)) {
              return 'animation-vendor';
            }
          }

          return undefined;
        }
      }
    }
  },
  resolve: {
    alias: {
      '@': '/src',
      '@utils': path.resolve(__dirname, 'src/utils'),
      '@content': path.resolve(__dirname, 'src/content')
    }
  },
  css: {
    postcss: {
      parser: safeParser
    }
  },
  assetsInclude: ['**/*.glb']
});
