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
        workbox: {
          maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    build: {
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          // 提高最小 chunk 大小，合并小文件
          experimentalMinChunkSize: 50000,
          // 控制代码分割策略
          manualChunks(id) {
            // 合并源码中的懒加载组件
            if (!id.includes('node_modules')) {
              // 用户认证相关页面合并
              if (id.includes('/page/user/') || id.includes('/page/oauth/')) {
                return 'auth';
              }
              // 分享相关页面合并
              if (id.includes('/page/share') || id.includes('/page/shared')) {
                return 'share';
              }
              // 聊天子页面合并
              if (
                id.includes('/page/chat/conversation') ||
                id.includes('/page/chat/conversations')
              ) {
                return 'chat-children';
              }
              // 其他次要页面合并
              if (
                id.includes('/page/invite') ||
                id.includes('/page/welcome') ||
                id.includes('/page/resource')
              ) {
                return 'misc';
              }
              return;
            }

            // 1. React 核心（最底层）
            if (
              id.includes('/react/') ||
              id.includes('/react-dom/') ||
              id.includes('/react-is/') ||
              id.includes('/scheduler/') ||
              id.includes('/use-sync-external-store/')
            ) {
              return 'react';
            }

            // 2. React Router（依赖 React）
            if (id.includes('react-router') || id.includes('@remix-run')) {
              return 'router';
            }

            // 3. UI 组件库（Radix 等，依赖 React）
            if (
              id.includes('@radix-ui') ||
              id.includes('@floating-ui') ||
              id.includes('react-remove-scroll') ||
              id.includes('react-focus-lock') ||
              id.includes('aria-hidden') ||
              id.includes('cmdk')
            ) {
              return 'ui';
            }

            // 4. 图标库（全部合并）
            if (
              id.includes('lucide-react') ||
              id.includes('@remixicon') ||
              id.includes('seti-icons') ||
              id.includes('simple-icons')
            ) {
              return 'icons';
            }

            // 5. 表单相关
            if (
              id.includes('react-hook-form') ||
              id.includes('@hookform') ||
              id.includes('zod') ||
              id.includes('libphonenumber')
            ) {
              return 'form';
            }

            // 6. 国际化
            if (
              id.includes('i18next') ||
              id.includes('react-i18next') ||
              id.includes('i18next-browser-languagedetector')
            ) {
              return 'i18n';
            }

            // 7. 工具库
            if (
              id.includes('lodash') ||
              id.includes('date-fns') ||
              id.includes('axios')
            ) {
              return 'utils';
            }

            // 8. Markdown 处理
            if (
              id.includes('react-markdown') ||
              id.includes('react-syntax-highlighter') ||
              id.includes('rehype') ||
              id.includes('remark') ||
              id.includes('unified') ||
              id.includes('micromark') ||
              id.includes('mdast') ||
              id.includes('hast') ||
              id.includes('vfile')
            ) {
              return 'markdown';
            }

            // 9. 大体积独立包（按需加载）
            if (id.includes('vditor')) {
              return 'vditor';
            }

            if (id.includes('katex')) {
              return 'katex';
            }

            // 10. 其他所有包
            return 'vendor';
          },
          // 合并小 chunk 到主入口
          inlineDynamicImports: false,
        },
      },
      // 优化依赖预打包
      commonjsOptions: {
        transformMixedEsModules: true,
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
