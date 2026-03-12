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
              if (
                id.includes('react') &&
                (id.includes('react/') ||
                  id.includes('react-dom') ||
                  id.includes('react-router') ||
                  id.includes('react-is'))
              ) {
                return 'react-vendor';
              }

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

              if (
                id.includes('lucide-react') ||
                id.includes('@remixicon') ||
                id.includes('seti-icons') ||
                id.includes('simple-icons')
              ) {
                return 'icons';
              }

              if (
                id.includes('react-markdown') ||
                id.includes('react-syntax-highlighter') ||
                id.includes('rehype') ||
                id.includes('remark') ||
                id.includes('unified') ||
                id.includes('markdown') ||
                id.includes('micromark') ||
                id.includes('mdast') ||
                id.includes('hast') ||
                id.includes('vfile')
              ) {
                return 'markdown-vendor';
              }

              if (id.includes('vditor')) {
                return 'vditor-vendor';
              }

              if (
                id.includes('react-hook-form') ||
                id.includes('@hookform') ||
                id.includes('zod')
              ) {
                return 'form-vendor';
              }

              if (
                id.includes('i18next') ||
                id.includes('react-i18next') ||
                id.includes('i18next-browser-languagedetector') ||
                id.includes('intl-messageformat')
              ) {
                return 'i18n-vendor';
              }

              if (
                id.includes('lodash') ||
                id.includes('axios') ||
                id.includes('date-fns')
              ) {
                return 'utils-vendor';
              }

              if (
                id.includes('katex') ||
                id.includes('rehype-katex') ||
                id.includes('remark-math')
              ) {
                return 'katex-vendor';
              }

              if (
                id.includes('react-dnd') ||
                id.includes('dnd-core') ||
                id.includes('react-dnd-html5-backend') ||
                id.includes('react-dnd-touch-backend')
              ) {
                return 'dnd-vendor';
              }

              if (id.includes('socket.io') || id.includes('engine.io')) {
                return 'socket-vendor';
              }

              if (id.includes('fingerprintjs')) {
                return 'fingerprint-vendor';
              }

              if (
                id.includes('jszip') ||
                id.includes('pako') ||
                id.includes('fflate')
              ) {
                return 'zip-vendor';
              }

              if (
                id.includes('html-react-parser') ||
                id.includes('html-dom-parser')
              ) {
                return 'html-parser-vendor';
              }

              if (id.includes('libphonenumber')) {
                return 'phone-vendor';
              }

              if (id.includes('qrcode')) {
                return 'qrcode-vendor';
              }

              return 'common-vendor';
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
