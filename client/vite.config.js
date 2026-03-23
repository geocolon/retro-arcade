import { defineConfig } from 'vite';
export default defineConfig({
  base: '/',
  build: { outDir: 'dist', assetsInlineLimit: 0 },
  server: {
    port: 3000,
    proxy: {
      '/socket.io': { target: 'http://localhost:4000', ws: true, changeOrigin: true },
      '/api':        { target: 'http://localhost:4000', changeOrigin: true },
    },
  },
});
