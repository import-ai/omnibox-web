import { Outlet } from 'react-router-dom';

import { Separator } from '@/components/ui/separator';
import { SidebarInset } from '@/components/ui/sidebar';
import { PublicShareInfo, ResourceMeta } from '@/interface';

import Header from './header';
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
  resource?: {
    id: string;
    name?: string;
    resource_type: string;
    updated_at?: string;
    created_at?: string;
  } | null;
  wide?: boolean;
  onWide?: (wide: boolean) => void;
}

export function ShareLayout(props: IProps) {
  const {
    shareInfo,
    isChatActive,
    showChat,
    currentResourceId,
    handleAddToContext,
    resource,
    wide,
    onWide,
  } = props;

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
      <SidebarInset className="m-[8px] bg-white rounded-[16px] dark:bg-background min-h-0 h-full md:h-[calc(100svh-16px)]">
        {!isChatActive && (
          <>
            <Header
              resource={resource}
              wide={wide}
              onWide={onWide}
              shareId={shareInfo.id}
            />
            <Separator className="bg-[#F2F2F2] dark:bg-[#303132]" />
          </>
        )}
        <div className="flex flex-1 flex-col min-h-0 overflow-auto">
          <Outlet />
        </div>
      </SidebarInset>
    </>
  );
}
