import Layout from '@/layout';
import Error from '@/layout/error';
import { lazy, Suspense } from 'react';
import { ThemeProvider } from '@/components/provider/theme-provider';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { GlobalContextProvider } from '@/components/provider/global-context-provider';

const Chat = lazy(() => import('@/app/chat'));
const LoginPage = lazy(() => import('@/app/user/login'));
const RegisterPage = lazy(() => import('@/app/user/register'));
const ForgotPasswordPage = lazy(() => import('@/app/user/password'));
const ResourcePage = lazy(() => import('@/app/resource-page'));
const Editor = lazy(() => import('@/components/resource/editor'));
const Render = lazy(() => import('@/components/resource/render'));
const NamespaceBase = lazy(() => import('@/components/namespace-base'));

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    errorElement: <Error />,
    children: [
      {
        path: 'user/login',
        element: <LoginPage />,
      },
      {
        path: 'user/register',
        element: <RegisterPage />,
      },
      {
        path: 'user/password',
        element: <ForgotPasswordPage />,
      },
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
