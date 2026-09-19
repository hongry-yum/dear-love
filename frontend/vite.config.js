import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// GitHub Pages serves this project at https://<user>.github.io/dear-love/,
// so all built asset URLs need that base path.
export default defineConfig({
  base: '/dear-love/',
  plugins: [react()],
})
