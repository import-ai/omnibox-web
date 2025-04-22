import Layout from '@/layout';
import Error from '@/layout/error';
import CoreApp from '@/hooks/app.class';
import { lazy, Suspense } from 'react';
import AppContext from '@/hooks/app-context';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

const LoginPage = lazy(() => import('@/page/user/login'));
const InvitePage = lazy(() => import('@/page/user/invite'));
const NamespaceBase = lazy(() => import('@/page/namespace'));
const RegisterPage = lazy(() => import('@/page/user/register'));
const ForgotPasswordPage = lazy(() => import('@/page/user/password'));
const PasswordComFirmPage = lazy(() => import('@/page/user/password-comfirm'));
const RegisterComFirmPage = lazy(() => import('@/page/user/register-comfirm'));

const app = new CoreApp();
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
        path: 'user/register-comfirm',
        element: <RegisterComFirmPage />,
      },
      {
        path: 'user/password',
        element: <ForgotPasswordPage />,
      },
      {
        path: 'user/password-comfirm',
        element: <PasswordComFirmPage />,
      },
      {
        path: 'user/invite',
        element: <InvitePage />,
      },
      {
        path: ':namespace',
        element: <NamespaceBase />,
      },
    ],
  },
]);

export default function Main() {
  return (
    <AppContext.Provider value={app}>
      <Suspense>
        <RouterProvider router={router} />
      </Suspense>
    </AppContext.Provider>
  );
}
