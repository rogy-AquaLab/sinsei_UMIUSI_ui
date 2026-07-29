import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react-swc'
import { defineConfig } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), tsconfigPaths()],
  server: {
    allowedHosts: ['umiusi2.local'],
    proxy: {
      '/api/terminal': {
        target: 'http://127.0.0.1:3001',
        ws: true,
      },
    },
  },
})
