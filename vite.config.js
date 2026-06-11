import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/timezone-clock-pro/',
  plugins: [react()],
  server: {
    port: 5173,
    host: true
  }
});