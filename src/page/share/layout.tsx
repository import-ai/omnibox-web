import { Outlet } from 'react-router-dom';

import { Separator } from '@/components/ui/separator';
import { SidebarInset } from '@/components/ui/sidebar';
import { PublicShareInfo, ResourceMeta, SharedResource } from '@/interface';

import Header from './header';
import ShareSidebar from './sidebar';

interface IProps {
  handleAddToContext: (
    resource: ResourceMeta,
    type: 'resource' | 'folder'
  ) => void;
  currentResourceId?: string;
  currentResourcePath?: Array<{ id: string }>;
  showChat: boolean | null;
  isChatActive: boolean;
  shareInfo: PublicShareInfo;
  resource?: SharedResource | null;
  wide?: boolean;
  onWide?: (wide: boolean) => void;
  showSidebar?: boolean;
}

export function ShareLayout(props: IProps) {
  const {
    shareInfo,
    isChatActive,
    showChat,
    currentResourceId,
    currentResourcePath,
    handleAddToContext,
    resource,
    wide,
    onWide,
    showSidebar = true,
  } = props;

  return (
    <>
      {showSidebar && (
        <ShareSidebar
          shareId={shareInfo.id}
          rootResource={shareInfo.resource}
          username={shareInfo.username}
          showChat={!!showChat}
          isChatActive={isChatActive}
          currentResourceId={currentResourceId}
          currentResourcePath={currentResourcePath}
          isResourceActive={resourceId =>
            !isChatActive && resourceId === currentResourceId
          }
          onAddToContext={handleAddToContext}
        />
      )}
      <SidebarInset className="m-[8px] h-full min-h-0 rounded-[16px] bg-white dark:bg-background md:h-[calc(100svh-16px)]">
        {!isChatActive && (
          <>
            <Header
              resource={resource}
              wide={wide}
              onWide={onWide}
              showSidebarTrigger={showSidebar}
            />
            <Separator className="bg-[#F2F2F2] dark:bg-[#303132]" />
          </>
        )}
        <div className="flex min-h-0 flex-1 flex-col overflow-auto">
          <Outlet />
        </div>
      </SidebarInset>
    </>
  );
}
