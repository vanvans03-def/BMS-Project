import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Map module ของ Node.js ให้ไปใช้ Library ที่เราลงไว้แทน
      stream: 'stream-browserify',
      events: 'events',
      buffer: 'buffer',
      util: 'util',
    },
  },
  // กำหนดตัวแปร global ให้เป็น window เพื่อรองรับ Library เก่าๆ
  define: {
    'global': 'window',
  },
})