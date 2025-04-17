import Layout from '@/layout';
import Error from '@/layout/error';
import CoreApp from '@/hooks/app.class';
import { lazy, Suspense } from 'react';
import AppContext from '@/hooks/app-context';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

const LoginPage = lazy(() => import('@/page/user/login'));
const NamespaceBase = lazy(() => import('@/page/namespace'));
const RegisterPage = lazy(() => import('@/page/user/register'));
const ForgotPasswordPage = lazy(() => import('@/page/user/password'));

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
        path: 'user/password',
        element: <ForgotPasswordPage />,
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
