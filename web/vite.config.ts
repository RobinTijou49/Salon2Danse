import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// En dev (npm run dev), on proxifie /api vers l'API NestJS locale.
// En prod, c'est Caddy qui route /api — ce proxy n'est pas utilisé.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
