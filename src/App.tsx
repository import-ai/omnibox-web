import Layout from '@/layout';
import Error from '@/layout/error';
import CoreApp from '@/hooks/app.class';
import { lazy, Suspense } from 'react';
import AppContext from '@/hooks/app-context';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

const ChatPage = lazy(() => import('@/page/chat'));
const ChatHomePage = lazy(() => import('@/page/chat/home'));
const ChatConversationPage = lazy(() => import('@/page/chat/conversation'));
const ChatConversationsPage = lazy(() => import('@/page/chat/conversations'));
const LoginPage = lazy(() => import('@/page/user/login'));
const InvitePage = lazy(() => import('@/page/user/invite'));
const ResourcePage = lazy(() => import('@/page/resource'));
const NamespacePage = lazy(() => import('@/page/namespace'));
const RegisterPage = lazy(() => import('@/page/user/register'));
const ForgotPasswordPage = lazy(() => import('@/page/user/password'));
const PasswordConfirmPage = lazy(() => import('@/page/user/password-confirm'));
const RegisterConfirmPage = lazy(() => import('@/page/user/register-confirm'));
const InviteRedirectPage = lazy(() => import('@/page/invite-redirect'));

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
        path: 'user/sign-up/confirm',
        element: <RegisterConfirmPage />,
      },
      {
        path: 'user/password',
        element: <ForgotPasswordPage />,
      },
      {
        path: 'user/password/confirm',
        element: <PasswordConfirmPage />,
      },
      {
        path: 'invite/confirm',
        element: <InvitePage />,
      },
      {
        path: 'invite/:namespace_id/:invitation_id',
        element: <InviteRedirectPage />,
      },
      {
        path: ':namespace_id',
        element: <NamespacePage />,
        children: [
          {
            path: ':resource_id?',
            element: <ResourcePage />,
          },
          {
            path: ':resource_id/edit',
            element: <ResourcePage />,
          },
          {
            path: 'chat',
            element: <ChatPage />,
            children: [
              {
                index: true,
                element: <ChatHomePage />,
              },
              {
                path: 'conversations',
                element: <ChatConversationsPage />,
              },
              {
                path: ':conversation_id',
                element: <ChatConversationPage />,
              },
            ],
          },
        ],
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
