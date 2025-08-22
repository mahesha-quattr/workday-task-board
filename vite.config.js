/* eslint-env node */
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// For GitHub Pages project site deployments, assets must resolve under `/<repo>/`.
// Use explicit default for build, while keeping dev simple at root.
export default defineConfig(({ command }) => {
  const base = command === 'serve' ? '/' : process.env.BASE_PATH || '/workday-task-board/';
  return {
    base,
    plugins: [react()],
  };
});
