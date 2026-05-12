import { Outlet } from 'react-router-dom';

import { SidebarTriggerButton } from '@/components/sidebar-trigger';
import { Separator } from '@/components/ui/separator';
import { SidebarInset } from '@/components/ui/sidebar';
import { PublicShareInfo, ResourceMeta, SharedResource } from '@/interface';

import Header from './header';
import ShareSidebar from './sidebar/index';

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
          allResources={shareInfo.all_resources}
        />
      )}
      <SidebarInset className="m-[8px] bg-white rounded-[16px] dark:bg-background min-h-0 h-full md:h-[calc(100svh-16px)]">
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
        {isChatActive && showSidebar && (
          <header className="sticky top-0 z-[30] flex min-h-12 shrink-0 items-center rounded-t-[16px] bg-white px-3 dark:bg-background">
            <SidebarTriggerButton collapse />
          </header>
        )}
        <div className="flex flex-1 flex-col min-h-0 overflow-auto">
          <Outlet />
        </div>
      </SidebarInset>
    </>
  );
}
