import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const API = process.env.VITE_API_TARGET || 'http://127.0.0.1:8000'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Same-origin in development, so the Django session + CSRF cookies just work.
    proxy: {
      '/api': API,
      '/print': API,
      '/static': API,
      '/django-admin': API,
    },
  },
  build: {
    outDir: '../backend/frontend_dist',
    emptyOutDir: true,
    sourcemap: false,
  },
})
