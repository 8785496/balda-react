import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  // сайт публикуется на GitHub Pages в подкаталог /balda-react/
  base: '/balda-react/',
  plugins: [react()],
});
