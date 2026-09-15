import { type CSSProperties, Suspense, useCallback, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';

import Loading from '@/components/loading';
import { SidebarTriggerButton } from '@/components/SidebarTriggerButton';
import { Separator } from '@/components/ui/Separator';
import { SidebarInset, useSidebar } from '@/components/ui/Sidebar';
import useApp from '@/hooks/useApp';
import { PublicShareInfo, ResourceMeta, SharedResource } from '@/interface';
import { cn } from '@/lib/utils';
import { ResourceCommentsProvider } from '@/page/resource/comments/ResourceCommentsContext';
import {
  selectUseOmniboxEditor,
  useResourceStore,
} from '@/page/resource/resourceStore';
import {
  resourcePaneColumnClassName,
  shouldUseFullWidthResourcePane,
  useResourcePaneLayout,
} from '@/page/resource/useResourcePaneLayout';

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
  chatOnly?: boolean;
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
    wide = false,
    onWide,
    showSidebar = true,
    chatOnly = false,
  } = props;
  const app = useApp();
  const { open, width: sidebarWidth } = useSidebar();
  const location = useLocation();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const useOmniboxEditor = useResourceStore(selectUseOmniboxEditor);
  const useFullWidth = shouldUseFullWidthResourcePane(
    useOmniboxEditor,
    resource?.resource_type
  );
  const showResourcePane = !isChatActive && !chatOnly;
  const onNearBottom = useCallback(() => {
    app.fire('scroll-to-bottom');
  }, [app]);
  const { large, compactResourcePane } = useResourcePaneLayout(
    scrollContainerRef,
    { enabled: showResourcePane, onNearBottom }
  );
  const sidebarActiveKey =
    typeof location.state?.sidebarActiveKey === 'string'
      ? location.state.sidebarActiveKey
      : currentResourceId;
  const showToc = !compactResourcePane;

  const showComments =
    !isChatActive &&
    !chatOnly &&
    !!resource?.content?.trim() &&
    !['folder', 'smart_folder', 'rss_folder'].includes(resource.resource_type);

  const content = (
    <>
      {showResourcePane && (
        <>
          <Header
            resource={resource}
            wide={wide}
            onWide={onWide}
            showSidebarTrigger={showSidebar}
            showComments={showComments}
          />
          <Separator className="bg-[#F2F2F2] dark:bg-[#303132]" />
        </>
      )}
      {isChatActive && showSidebar && (
        <header className="sticky top-0 z-[30] flex min-h-12 min-w-0 shrink-0 items-center rounded-t-[16px] bg-white px-3 dark:bg-background">
          <SidebarTriggerButton collapse />
        </header>
      )}
      {showResourcePane ? (
        <div
          ref={scrollContainerRef}
          data-resource-scroll
          className="no-scrollbar flex min-w-0 flex-1 justify-center overflow-x-hidden overflow-y-auto p-4"
        >
          <div
            className={cn(
              'flex w-full min-w-0 max-w-full flex-col',
              resourcePaneColumnClassName({
                wide,
                useFullWidth,
                sidebarOpen: open,
                large,
              })
            )}
            style={!wide && useFullWidth ? { maxWidth: '100%' } : undefined}
          >
            <Suspense fallback={<Loading />}>
              <Outlet context={{ showToc }} />
            </Suspense>
          </div>
        </div>
      ) : (
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <Suspense fallback={<Loading />}>
            <Outlet />
          </Suspense>
        </div>
      )}
    </>
  );

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
            !isChatActive && resourceId === sidebarActiveKey
          }
          onAddToContext={handleAddToContext}
          canBrowseResources={shareInfo.all_resources}
          showResources={!chatOnly}
        />
      )}
      <SidebarInset
        className={cn(
          'm-[8px] h-full min-h-0 min-w-0 overflow-hidden rounded-[16px] bg-white dark:bg-background md:h-[calc(100svh-16px)]',
          showResourcePane &&
            compactResourcePane &&
            'resource-detail-view--compact'
        )}
        style={
          {
            '--resource-toc-left': `${(open ? sidebarWidth : 0) + 16}px`,
          } as CSSProperties
        }
      >
        {showComments ? (
          <ResourceCommentsProvider
            key={currentResourceId ?? resource?.id}
            namespaceId={`share:${shareInfo.id}`}
          >
            {content}
          </ResourceCommentsProvider>
        ) : (
          content
        )}
      </SidebarInset>
    </>
  );
}
