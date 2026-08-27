import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  return {
    plugins: [react()],
    server: {
      port: 5174, // distinct du frontend Congés (5173) pour pouvoir tourner en parallèle
      proxy: {
        // Le backend (vote-deg/server) monte ses routes à la racine
        // (/auth, /admin, /candidates, /health, /uploads/...), sans préfixe —
        // on retire /api avant de transmettre, comme en prod (cf. nginx).
        '/api': {
          target: process.env.VITE_VOTE_API_TARGET ?? 'http://localhost:4300',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
        },
      },
    },
  }
})
