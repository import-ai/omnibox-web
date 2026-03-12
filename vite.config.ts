import path from 'node:path';

import react from '@vitejs/plugin-react';
import { execSync } from 'child_process';
import { defineConfig, loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

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
    plugins: [
      react(),
      VitePWA({
        injectRegister: false,
        manifest: false,
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    build: {
      chunkSizeWarningLimit: 1600,
      rollupOptions: {
        output: {
          experimentalMinChunkSize: 30000,
          manualChunks: id => {
            if (id.includes('node_modules')) {
              // React 核心（最底层）
              if (
                id.includes('react') ||
                id.includes('scheduler') ||
                id.includes('use-sync-external-store')
              ) {
                return 'react-vendor';
              }

              // UI 组件库（依赖 React）
              if (
                id.includes('@radix-ui') ||
                id.includes('aria-hidden') ||
                id.includes('react-remove-scroll') ||
                id.includes('@floating-ui') ||
                id.includes('react-focus-lock') ||
                id.includes('@react-aria') ||
                id.includes('cmdk')
              ) {
                return 'ui-vendor';
              }

              // 图标库
              if (
                id.includes('lucide-react') ||
                id.includes('@remixicon') ||
                id.includes('seti-icons') ||
                id.includes('simple-icons')
              ) {
                return 'icons';
              }

              // Vditor 编辑器
              if (id.includes('vditor')) {
                return 'vditor-vendor';
              }

              // KaTeX 数学公式
              if (id.includes('katex')) {
                return 'katex-vendor';
              }

              // 其他所有 node_modules 包
              return 'vendor';
            }

            return;
          },
        },
      },
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
            process.env.VITE_VDITOR_DIST_PATH ??
            env.VITE_VDITOR_DIST_PATH ??
            'https://test.omnibox.pro',
          changeOrigin: true,
        },
        '^/(docs|community|zh-cn|product|en|_next|static)': {
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
