import path from 'node:path';
import { execSync } from 'child_process';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

let gitHash = 'unknown';
try {
  gitHash = execSync('git rev-parse --short HEAD').toString().trim();
} catch (error) {
  console.error('Failed to get git hash:', error);
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd());
  return {
    define: {
      'import.meta.env.VITE_APP_VERSION': JSON.stringify(gitHash),
    },
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
