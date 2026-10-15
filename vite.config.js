import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { viteAssistantApiPlugin } from './scripts/viteAssistantApiPlugin.js'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), viteAssistantApiPlugin()],
  server: {
    host: '127.0.0.1',
    port: 43123,
    strictPort: true,
  },
  preview: {
    host: '127.0.0.1',
    port: 43124,
    strictPort: true,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.js'],
  },
})
