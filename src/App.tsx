import Layout from '@/layout';
import Error from '@/layout/error';
import CoreApp from '@/hooks/app.class';
import { lazy, Suspense } from 'react';
import AppContext from '@/hooks/app-context';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

const AppPage = lazy(() => import('@/page/app'));
const LoginPage = lazy(() => import('@/page/user/login'));
const InvitePage = lazy(() => import('@/page/user/invite'));
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
        path: 'user/sign-up',
        element: <RegisterPage />,
      },
      {
        path: 'user/sign-up/comfirm',
        element: <RegisterComFirmPage />,
      },
      {
        path: 'user/password',
        element: <ForgotPasswordPage />,
      },
      {
        path: 'user/password/comfirm',
        element: <PasswordComFirmPage />,
      },
      {
        path: 'invite/comfirm',
        element: <InvitePage />,
      },
      {
        path: ':resourceId?',
        element: <AppPage />,
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
