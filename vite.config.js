import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Allow overriding base path via env var for GitHub Pages project sites
const base = process.env.BASE_PATH || '/'

export default defineConfig({
  base,
  plugins: [react()],
})
