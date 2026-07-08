import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import {resolve, dirname} from "path";
import {fileURLToPath} from "url";


export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Proxies /api/* to the small local Node server started by
    // `npm run dev` (see scripts/dev.mjs + scripts/dev-api-server.mjs) so
    // POST /api/harshbot resolves under plain `vite` instead of 404ing —
    // same-origin from the browser's point of view, no CORS needed.
    proxy: {
      '/api': {
        target: `http://127.0.0.1:${process.env.HARSHBOT_API_PORT || 8787}`,
        changeOrigin: true,
      },
    },
  },
  resolve:{
    alias:{
      '#components': resolve(dirname(fileURLToPath(import.meta.url)), 'components'),
      '#constants': resolve(dirname(fileURLToPath(import.meta.url)), 'src/constants'),
      '#store': resolve(dirname(fileURLToPath(import.meta.url)), 'src/store'),
      '#hoc': resolve(dirname(fileURLToPath(import.meta.url)), 'src/hoc'),
      '#windows': resolve(dirname(fileURLToPath(import.meta.url)), 'src/windows'),
      '#utils': resolve(dirname(fileURLToPath(import.meta.url)), 'src/utils'),
      '#hooks': resolve(dirname(fileURLToPath(import.meta.url)), 'src/hooks'),
      '#services': resolve(dirname(fileURLToPath(import.meta.url)), 'src/services'),

    }
  }
})
