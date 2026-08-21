import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  // the site is published on GitHub Pages under /balda-react/
  base: '/balda-react/',
  // dev server listens on IPv4 127.0.0.1 (not ::1 that localhost may resolve to)
  server: {
    host: '127.0.0.1',
  },
  plugins: [react()],
});
