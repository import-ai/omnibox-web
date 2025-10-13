import { Outlet } from 'react-router-dom';

import { SidebarTrigger, useSidebar } from '@/components/ui/sidebar';
import { PublicShareInfo, ResourceMeta } from '@/interface';

import ShareSidebar from './sidebar';

interface IProps {
  handleAddToContext: (
    resource: ResourceMeta,
    type: 'resource' | 'folder'
  ) => void;
  currentResourceId?: string;
  showChat: boolean | null;
  isChatActive: boolean;
  shareInfo: PublicShareInfo;
}

export function ShareLayout(props: IProps) {
  const {
    shareInfo,
    isChatActive,
    showChat,
    currentResourceId,
    handleAddToContext,
  } = props;
  const { isMobile } = useSidebar();

  return (
    <>
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
      <main className="flex-1 bg-white dark:bg-background">
        {isMobile && <SidebarTrigger />}
        <Outlet />
      </main>
    </>
  );
}
