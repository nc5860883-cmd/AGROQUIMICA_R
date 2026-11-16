import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    // El proyecto está en OneDrive: el aviso de cambios del sistema a veces
    // se pierde, así que Vite revisa los archivos cada medio segundo.
    watch: { usePolling: true, interval: 500 },
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8001',
        changeOrigin: true,
      },
      '/media': {
        target: 'http://127.0.0.1:8001',
        changeOrigin: true,
      },
    },
  },
})
