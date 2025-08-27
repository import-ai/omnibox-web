import { lazy, Suspense } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

import CoreApp from '@/hooks/app.class';
import AppContext from '@/hooks/app-context';
import Layout from '@/layout';
import Error from '@/layout/error';

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
const InviteRedirectPage = lazy(() => import('@/page/invite-redirect'));
const PasswordConfirmPage = lazy(() => import('@/page/user/password-confirm'));
const RegisterConfirmPage = lazy(() => import('@/page/user/register-confirm'));
const WechatAuthConfirmPage = lazy(
  () => import('@/page/user/wechat/auth-confirm')
);
const GoogleAuthConfirmPage = lazy(
  () => import('@/page/user/google/auth-confirm')
);

const SharePage = lazy(() => import('@/page/share'));
const SharedResourcePage = lazy(() => import('@/page/shared-resource'));

const PrivacyPolicy = lazy(() => import('@/page/single/privacy-policy'));
const TermsOfService = lazy(() => import('@/page/single/terms-of-service'));

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
        path: 'user/auth/confirm',
        element: <WechatAuthConfirmPage />,
      },
      {
        path: 'user/auth/confirm/google',
        element: <GoogleAuthConfirmPage />,
      },
      {
        path: 'single/privacy-policy',
        element: <PrivacyPolicy />,
      },
      {
        path: 'single/terms-of-service',
        element: <TermsOfService />,
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
      {
        path: 's/:share_id',
        element: <SharePage />,
        children: [
          {
            index: true,
            element: <SharedResourcePage />,
          },
          {
            path: ':resource_id',
            element: <SharedResourcePage />,
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
