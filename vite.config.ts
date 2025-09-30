import path from 'node:path';

import react from '@vitejs/plugin-react';
import { execSync } from 'child_process';
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
        // Proxy attachment routes to API
        '^/[^/]+/[^/]+/attachments/[^/]+$': {
          target:
            process.env.VITE_API_PATH ??
            env.VITE_API_PATH ??
            'http://127.0.0.1:8000',
          changeOrigin: true,
          rewrite: path => {
            const segments = path.split('/').filter(Boolean);
            if (segments.length === 4 && segments[2] === 'attachments') {
              const namespaceId = segments[0];
              const resourceId = segments[1];
              const attachmentId = segments[3];
              return `/api/v1/namespaces/${namespaceId}/resources/${resourceId}/attachments/${attachmentId}`;
            }
            return path;
          },
        },
        '^/s/[^/]+/[^/]+/attachments/[^/]+$': {
          target:
            process.env.VITE_API_PATH ??
            env.VITE_API_PATH ??
            'http://127.0.0.1:8000',
          changeOrigin: true,
          rewrite: path => {
            const segments = path.split('/').filter(Boolean);
            if (segments.length === 5 && segments[3] === 'attachments') {
              const shareId = segments[1];
              const resourceId = segments[2];
              const attachmentId = segments[4];
              return `/api/v1/shares/${shareId}/resources/${resourceId}/attachments/${attachmentId}`;
            }
            return path;
          },
        },
        '/api/v1/socket.io': {
          target:
            process.env.VITE_API_PATH ??
            env.VITE_API_PATH ??
            'http://127.0.0.1:8000',
          changeOrigin: true,
          ws: true,
        },
      },
    },
  };
});
