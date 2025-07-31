import path from 'node:path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd());
  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    build: {
      chunkSizeWarningLimit: 1600,
    },
    server: {
      proxy: {
        '/api/v1': {
          target:
            process.env.VITE_API_PATH ??
            env.VITE_API_PATH ??
            'http://127.0.0.1:8000',
          changeOrigin: true,
        },
        '/assets/vditor': {
          target:
            process.env.VITE_API_PATH ??
            env.VITE_API_PATH ??
            'http://127.0.0.1:8000',
          changeOrigin: true,
        },
      },
    },
  };
});
