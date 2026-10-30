import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// /api is proxied to the local API so session cookies are same-origin, as they are behind Vercel's rewrite.
const proxy = { '/api': 'http://localhost:4000' }

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { proxy },
  preview: { proxy },
})
