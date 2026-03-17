import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    allowedHosts: [
      'localhost',
      '127.0.0.1',
      '.ngrok-free.dev',     // ngrok 모든 도메인 허용
      '.ngrok.io',           // ngrok 구버전도 지원
    ],
  },
})
