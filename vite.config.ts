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
        // Commercial module routes (pay, orders, products, feedback)
        '^/api/v1/(pay|orders|products|feedback)': {
          target:
            process.env.VITE_API_PATH_PRO ??
            env.VITE_API_PATH_PRO ??
            'http://127.0.0.1:8001',
          changeOrigin: true,
        },
        // Open source module routes (all other APIs)
        '/api/v1': {
          target:
            process.env.VITE_API_PATH ??
            env.VITE_API_PATH ??
            'http://127.0.0.1:8000',
          changeOrigin: true,
        },
        '/assets/vditor': {
          target:
            process.env.VITE_VDITOR_DIST_PATH ??
            env.VITE_VDITOR_DIST_PATH ??
            'https://test.omnibox.pro',
          changeOrigin: true,
        },
        '/docs': {
          target:
            process.env.VITE_API_PATH ??
            env.VITE_API_PATH ??
            'http://127.0.0.1:8000',
          changeOrigin: true,
        },
        // Proxy attachment routes to API (open source module)
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
