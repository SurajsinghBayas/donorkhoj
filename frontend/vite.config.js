import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
  ],
  build: {
    // Single-file app shell; chunk is large due to recharts + framer-motion.
    // Vercel serves it gzipped (~209 kB) with immutable asset caching.
    chunkSizeWarningLimit: 750,
  },
})
