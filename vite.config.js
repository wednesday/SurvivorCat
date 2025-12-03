import { defineConfig } from 'vite';

export default defineConfig({
  base: './', // 使用相对路径，确保打包后资源路径正确
  server: {
    port: 5173,
    host: '0.0.0.0',
    open: true
  },
  build: {
    target: 'esnext',
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        manualChunks: undefined
      }
    }
  }
});
