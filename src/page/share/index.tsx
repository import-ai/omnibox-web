import axios, { CancelTokenSource } from 'axios';
import { t } from 'i18next';
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';

import Loading from '@/components/loading';
import { SidebarProvider } from '@/components/ui/sidebar';
import { PublicShareInfo, SharedResource } from '@/interface';
import { setCookie } from '@/lib/cookie';
import { http } from '@/lib/request';

import { Password } from './password';
import ShareSidebar from './sidebar';

const SHARE_PASSWORD_COOKIE = 'share-password';

interface ShareContextValue {
  shareInfo: PublicShareInfo | null;
  resource: SharedResource | null;
}

const ShareContext = createContext<ShareContextValue | null>(null);

export const useShareContext = () => {
  const context = useContext(ShareContext);
  if (!context) {
    throw new Error('useShareContext must be used within SharePage');
  }
  return context;
};

export default function SharePage() {
  const params = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const cancelTokenSource = useRef<CancelTokenSource>(null);
  const [shareInfo, setShareInfo] = useState<PublicShareInfo | null>(null);
  const [resource, setResource] = useState<SharedResource | null>(null);
  const [requirePassword, setRequirePassword] = useState<boolean>(false);
  const [passwordFailed, setPasswordFailed] = useState<boolean>(false);
  const [passwordLoading, setPasswordLoading] = useState<boolean>(false);
  const shareId = params.share_id;
  const isOnChatRoute = location.pathname.includes('/chat');
  const currentResourceId = params.resource_id || shareInfo?.resource?.id;
  const showChat = shareInfo && shareInfo.share_type !== 'doc_only';

  const handlePassword = (password: string) => {
    setPasswordLoading(true);
    setCookie(SHARE_PASSWORD_COOKIE, password, `/s/${shareId}`);
    setCookie(SHARE_PASSWORD_COOKIE, password, `/api/v1/shares/${shareId}`);
    if (cancelTokenSource.current) {
      cancelTokenSource.current.cancel('Canceled due to new request.');
    }
    cancelTokenSource.current = axios.CancelToken.source();
    http
      .get(`/shares/${shareId}`, {
        cancelToken: cancelTokenSource.current.token,
      })
      .then(data => {
        setPasswordLoading(false);
        setRequirePassword(false);
        setShareInfo(data);
      })
      .catch(err => {
        setPasswordLoading(false);
        if (err && err.status && err.status === 403) {
          setPasswordFailed(true);
        }
      });
  };

  // Get share info
  useEffect(() => {
    setShareInfo(null);
    const source = axios.CancelToken.source();
    http
      .get(`/shares/${shareId}`, {
        cancelToken: source.token,
      })
      .then(data => {
        setShareInfo(data);
      })
      .catch(err => {
        if (err && err.status && err.status === 401) {
          // Redirect to login page
          const currentUrl = encodeURIComponent(window.location.pathname);
          navigate(`/user/login?redirect=${currentUrl}`);
        }
        if (err && err.status && err.status === 403) {
          setRequirePassword(true);
        }
      });
    return () => source.cancel();
  }, [shareId]);

  // Get resource info
  useEffect(() => {
    setResource(null);
    if (!shareInfo) {
      return;
    }
    const source = axios.CancelToken.source();
    http
      .get(`/shares/${shareId}/resources/${currentResourceId}`, {
        cancelToken: source.token,
      })
      .then(data => {
        setResource(data);
      })
      .catch(err => {
        if (err && err.status && err.status === 401) {
          // Redirect to login page
          const currentUrl = encodeURIComponent(window.location.pathname);
          navigate(`/user/login?redirect=${currentUrl}`);
        }
        if (err && err.status && err.status === 403) {
          setRequirePassword(true);
        }
      });
    return () => source.cancel();
  }, [shareInfo, currentResourceId]);

  if (requirePassword) {
    return (
      <div className="flex justify-center p-10">
        <div className="flex flex-col gap-4 w-[400px]">
          <span className="text-sm">
            {t('shared_resources.password_required')}
          </span>
          <Password
            passwordFailed={passwordFailed}
            loading={passwordLoading}
            onPassword={handlePassword}
          />
        </div>
      </div>
    );
  }
  if (shareInfo) {
    const showSidebar = shareInfo.all_resources || showChat;
    return (
      <ShareContext.Provider value={{ shareInfo, resource }}>
        {!showSidebar && <Outlet />}
        {showSidebar && (
          <SidebarProvider>
            <ShareSidebar
              shareId={shareInfo.id}
              rootResource={shareInfo.resource}
              showChat={!!showChat}
              isResourceActive={resourceId =>
                !isOnChatRoute && resourceId === currentResourceId
              }
            />
            <main className="flex-1">
              <Outlet />
            </main>
          </SidebarProvider>
        )}
      </ShareContext.Provider>
    );
  }
  return <Loading />;
}
