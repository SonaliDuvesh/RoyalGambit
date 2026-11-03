import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE_PATH || (process.env.VERCEL ? '/' : './'), // Ensures assets load correctly on Vercel, Capacitor, and GitHub Pages
  server: {
    host: '0.0.0.0', // Listen on all network interfaces
    port: 5173,
    allowedHosts: true, // Allow ngrok, localtunnel, and custom domains
    proxy: {
      '/socket.io': {
        target: 'http://localhost:3001',
        ws: true
      }
    }
  }
});
