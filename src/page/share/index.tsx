import axios, { CancelTokenSource } from 'axios';
import { t } from 'i18next';
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';

import Loading from '@/components/loading';
import { SidebarProvider } from '@/components/ui/sidebar';
import { PublicShareInfo, ResourceMeta, SharedResource } from '@/interface';
import { getCookie, setCookie } from '@/lib/cookie';
import { http } from '@/lib/request';
import {
  ChatMode,
  IResTypeContext,
  ToolType,
} from '@/page/chat/chat-input/types';

import { Password } from './password';
import ShareSidebar from './sidebar';

const SHARE_PASSWORD_COOKIE = 'share-password';

interface ShareContextValue {
  shareInfo: PublicShareInfo | null;
  resource: SharedResource | null;
  selectedResources: IResTypeContext[];
  setSelectedResources: (resources: IResTypeContext[]) => void;
  chatInput: string;
  setChatInput: (input: string) => void;
  mode: ChatMode;
  setMode: (mode: ChatMode) => void;
  tools: Array<ToolType>;
  setTools: (tools: Array<ToolType>) => void;
  password: string | null;
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
  const [selectedResources, setSelectedResources] = useState<IResTypeContext[]>(
    []
  );
  const [chatInput, setChatInput] = useState<string>('');
  const [mode, setMode] = useState<ChatMode>(ChatMode.ASK);
  const [tools, setTools] = useState<Array<ToolType>>([
    ToolType.PRIVATE_SEARCH,
  ]);
  const [requirePassword, setRequirePassword] = useState<boolean>(false);
  const [passwordFailed, setPasswordFailed] = useState<boolean>(false);
  const [passwordLoading, setPasswordLoading] = useState<boolean>(false);
  const [password, setPassword] = useState<string | null>(
    getCookie(SHARE_PASSWORD_COOKIE)
  );
  const shareId = params.share_id;
  const currentResourceId = params.resource_id || shareInfo?.resource?.id;
  const isChatActive = location.pathname.includes('/chat');
  const showChat = shareInfo && shareInfo.share_type !== 'doc_only';

  const handleAddToContext = (
    resource: ResourceMeta,
    type: 'resource' | 'folder'
  ) => {
    const target = selectedResources.find(
      item => item.resource.id === resource.id && item.type === type
    );
    if (target) {
      return;
    }
    setSelectedResources([
      ...selectedResources,
      {
        type,
        resource,
      },
    ]);
  };

  const handlePassword = (password: string) => {
    setPasswordLoading(true);
    setCookie(SHARE_PASSWORD_COOKIE, password, `/s/${shareId}`);
    setCookie(SHARE_PASSWORD_COOKIE, password, `/api/v1/shares/${shareId}`);
    setPassword(password);
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
      <ShareContext.Provider
        value={{
          shareInfo,
          resource,
          selectedResources,
          setSelectedResources,
          chatInput,
          setChatInput,
          mode,
          setMode,
          tools,
          setTools,
          password,
        }}
      >
        {!showSidebar && <Outlet />}
        {showSidebar && (
          <SidebarProvider>
            <ShareSidebar
              shareId={shareInfo.id}
              rootResource={shareInfo.resource}
              username={shareInfo.username}
              showChat={!!showChat}
              isChatActive={isChatActive}
              isResourceActive={resourceId =>
                !isChatActive && resourceId === currentResourceId
              }
              onAddToContext={handleAddToContext}
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
