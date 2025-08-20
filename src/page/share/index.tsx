import axios from 'axios';
import { createContext, useContext, useEffect, useState } from 'react';
import { Outlet, useNavigate, useParams } from 'react-router-dom';

import Loading from '@/components/loading';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ShareInfo } from '@/interface';
import { http } from '@/lib/request';

import ShareSidebar from './sidebar';

interface ShareContextValue {
  shareInfo: ShareInfo | null;
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
  const navigate = useNavigate();
  const shareId = params.share_id;

  const [shareInfo, setShareInfo] = useState<ShareInfo | null>(null);

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
          // Share requires login, redirect to login page with current URL as redirect
          const currentUrl = encodeURIComponent(window.location.pathname);
          navigate(`/user/login?redirect=${currentUrl}`);
        }
      });
    return () => source.cancel();
  }, [shareId]);

  if (!shareInfo) {
    return <Loading />;
  }

  return (
    <ShareContext.Provider value={{ shareInfo }}>
      {!shareInfo.all_resources && <Outlet />}
      {shareInfo.all_resources && (
        <SidebarProvider>
          <ShareSidebar
            shareId={shareInfo.id}
            rootResourceId={shareInfo.resource_id}
            rootResourceName="Shared Resources"
          />
          <main className="flex-1">
            <Outlet />
          </main>
        </SidebarProvider>
      )}
    </ShareContext.Provider>
  );
}
