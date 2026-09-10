import { lazy } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

import CoreApp from '@/hooks/app.class';
import AppContext from '@/hooks/appContext';
import { AuthConfigProvider } from '@/hooks/AuthConfigContext';
import Layout from '@/layout';
import Error from '@/layout/ErrorPage';
import { lazyRoute } from '@/lib/lazyRoute';
import ChatPage from '@/page/chat';
import ChatHomePage from '@/page/chat/ChatHomePage';
import NamespacePage from '@/page/namespace';

const LoginPage = lazy(() => import('@/page/user/login'));
const InvitePage = lazy(() => import('@/page/user/InvitePage'));
const RegisterPage = lazy(() => import('@/page/user/register'));
const VerifyOtpPage = lazy(() => import('@/page/user/VerifyOtpPage'));
const AcceptInvitePage = lazy(() => import('@/page/user/AcceptInvitePage'));
const InviteRedirectPage = lazy(() => import('@/page/invite-redirect'));
const AccountDeleteConfirmPage = lazy(
  () => import('@/page/user/AccountDeleteConfirm')
);
const WechatAuthConfirmPage = lazy(
  () => import('@/page/user/wechat/AuthConfirmPage')
);
const WechatMiniProgramAuthPage = lazy(
  () => import('@/page/user/wechat/MiniProgramAuthPage')
);
const GoogleAuthConfirmPage = lazy(
  () => import('@/page/user/google/AuthConfirmPage')
);
const OAuthAuthorizePage = lazy(
  () => import('@/page/oauth/OAuthAuthorizePage')
);

const SharePage = lazy(() => import('@/page/share'));
const SharedResourcePage = lazy(() => import('@/page/shared-resource'));
const SharedChatHomePage = lazy(
  () => import('@/page/shared-chat/SharedChatHomePage')
);
const SharedChatConversationPage = lazy(
  () => import('@/page/shared-chat/SharedChatConversationPage')
);

const WelcomePage = lazy(() => import('@/page/welcome'));

const loadResourcePage = lazyRoute(() => import('@/page/resource'));
const loadRssItemRedirect = lazyRoute(
  () => import('@/page/resource/RssItemRedirect')
);
const loadChatConversationsPage = lazyRoute(
  () => import('@/page/chat/conversations')
);
const loadChatConversationPage = lazyRoute(
  () => import('@/page/chat/conversation')
);

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
        path: 'user/auth/miniprogram',
        element: <WechatMiniProgramAuthPage />,
      },
      {
        path: 'user/auth/confirm/google',
        element: <GoogleAuthConfirmPage />,
      },
      {
        path: 'oauth/authorize',
        element: <OAuthAuthorizePage />,
      },
      {
        path: 'welcome',
        element: <WelcomePage />,
      },
      {
        path: 'user/sign-up',
        element: <RegisterPage />,
      },
      {
        path: 'user/verify-otp',
        element: <VerifyOtpPage />,
      },
      {
        path: 'user/accept-invite',
        element: <AcceptInvitePage />,
      },
      {
        path: 'user/account/delete/confirm',
        element: <AccountDeleteConfirmPage />,
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
            lazy: loadResourcePage,
          },
          {
            // Legacy rss item links, now ordinary resources.
            path: ':resource_id/rss-items/:rss_item_id',
            lazy: loadRssItemRedirect,
          },
          {
            path: ':resource_id/edit',
            lazy: loadResourcePage,
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
                lazy: loadChatConversationsPage,
              },
              {
                path: ':conversation_id',
                lazy: loadChatConversationPage,
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
          {
            // Legacy shared rss item links, now ordinary resources.
            path: ':resource_id/rss-items/:rss_item_id',
            lazy: loadRssItemRedirect,
          },
          {
            path: 'chat',
            element: <SharedChatHomePage />,
          },
          {
            path: 'chat/:conversation_id',
            element: <SharedChatConversationPage />,
          },
        ],
      },
    ],
  },
]);

export default function Main() {
  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden">
      <AppContext.Provider value={app}>
        <AuthConfigProvider>
          <RouterProvider router={router} />
        </AuthConfigProvider>
      </AppContext.Provider>
    </div>
  );
}
