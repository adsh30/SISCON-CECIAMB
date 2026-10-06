import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true, // escucha en IPv4 e IPv6 (127.0.0.1, localhost y la red interna)
    port: 5173,
    proxy: {
      '/api': 'http://localhost:4000',
    },
  },
})
