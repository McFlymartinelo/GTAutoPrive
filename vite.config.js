import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      // Forme objet sans changeOrigin : Host reste celui du navigateur, ce qui satisfait le contrôle Origin/Host
      // du serveur (la forme abrégée '/api': 'url' réécrit Host et provoquait un 403).
      '/api': { target: 'http://localhost:3001', changeOrigin: false },
    },
  },
});
