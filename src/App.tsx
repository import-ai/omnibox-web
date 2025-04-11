import { ThemeProvider } from '@/components/provider/theme-provider';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import LoginPage from '@/app/login-page';
import { lazy, Suspense } from 'react';
import Error from './error';
import Layout from './layout';
import { GlobalContextProvider } from '@/components/provider/global-context-provider';

const NamespaceBase = lazy(() => import('@/components/namespace-base'));
const Chat = lazy(() => import('@/app/chat'));
const Editor = lazy(() => import('@/components/resource/editor'));
const Render = lazy(() => import('@/components/resource/render'));
const ResourcePage = lazy(() => import('@/app/resource-page'));

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    errorElement: <Error />,
    children: [
      {
        path: ':namespace',
        element: <NamespaceBase />,
        children: [
          {
            index: true,
            element: <Chat />,
          },
          {
            path: ':resourceId',
            element: <ResourcePage />,
            children: [
              {
                index: true,
                element: <Render />,
              },
              {
                path: 'edit',
                element: <Editor />,
              },
            ],
          },
        ],
      },
      {
        path: 'login',
        element: <LoginPage />,
      },
    ],
  },
]);

export default function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      <GlobalContextProvider>
        <Suspense>
          <RouterProvider router={router} />
        </Suspense>
      </GlobalContextProvider>
    </ThemeProvider>
  );
}
