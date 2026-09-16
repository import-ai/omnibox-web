import {
  type CSSProperties,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import { ResourceTasksProvider } from '@/components/attributes/resource-tasks/ResourceTasksContext';
import { Separator } from '@/components/ui/Separator';
import { SidebarInset, useSidebar } from '@/components/ui/Sidebar';
import type { IUseResource } from '@/hooks/userResource';
import useWide from '@/hooks/useWide';
import { cn } from '@/lib/utils';
import {
  getCopilotWorkspace,
  useCopilotStore,
} from '@/page/copilot/copilotStore';
import { COPILOT_PANEL_TRANSITION_MS } from '@/page/copilot/useCopilotPanelLayout';
import {
  selectUseOmniboxEditor,
  useResourceStore,
} from '@/page/resource/resourceStore';
import { useResourceBodyDragAutoScroll } from '@/page/resource/useResourceBodyDragAutoScroll';
import {
  isFolderLikeResourceType,
  resourcePaneColumnClassName,
  shouldUseFullWidthResourcePane,
  useResourcePaneLayout,
} from '@/page/resource/useResourcePaneLayout';

import {
  ResourceCommentsProvider,
  useResourceCommentsPanel,
} from './comments/ResourceCommentsContext';
import Header from './header';
import Wrapper from './Wrapper';

interface ResourceDetailViewProps extends IUseResource {
  error?: boolean;
  flush?: boolean;
  scrollToLine?: number;
}

/** Shared visual shell for routed resources and in-place Copilot previews. */
function ResourceDetailContent({
  error = false,
  flush = false,
  ...resourceProps
}: ResourceDetailViewProps) {
  const { wide, onWide } = useWide();
  const { open, width: sidebarWidth } = useSidebar();
  const {
    app,
    editPage,
    forbidden,
    loading,
    namespaceId,
    notFound,
    resource,
    resourceId,
  } = resourceProps;
  const resourceMatchesTarget = resource?.id === resourceId;
  const currentResource = resourceMatchesTarget ? resource : null;
  const currentResourceProps = {
    ...resourceProps,
    loading:
      loading ||
      (!!resourceId &&
        !resourceMatchesTarget &&
        !error &&
        !forbidden &&
        !notFound),
    resource: currentResource,
  };
  const copilotOpen = useCopilotStore(
    state => getCopilotWorkspace(state, namespaceId).open
  );
  const [copilotLayoutOpen, setCopilotLayoutOpen] = useState(copilotOpen);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const useOmniboxEditor = useResourceStore(selectUseOmniboxEditor);
  const areFeaturePreviewsLoaded = useResourceStore(
    state =>
      state.featurePreviewsUserId !== null &&
      state.featurePreviewsUserId === localStorage.getItem('uid')
  );
  const commentsPanel = useResourceCommentsPanel();
  const commentsPanelOpen = commentsPanel?.panelOpen ?? false;
  const closeCommentsPanel = commentsPanel?.setPanelOpen;
  const isFolderResource = isFolderLikeResourceType(
    currentResource?.resource_type
  );
  const useFullWidth = shouldUseFullWidthResourcePane(
    useOmniboxEditor,
    currentResource?.resource_type
  );
  const onNearBottom = useCallback(() => {
    app.fire('scroll-to-bottom');
  }, [app]);
  const { large, compactResourcePane } = useResourcePaneLayout(
    scrollContainerRef,
    { onNearBottom }
  );

  useResourceBodyDragAutoScroll(scrollContainerRef, useFullWidth && editPage);

  useEffect(() => {
    if (
      (isFolderResource || (areFeaturePreviewsLoaded && !useOmniboxEditor)) &&
      commentsPanelOpen &&
      closeCommentsPanel
    ) {
      closeCommentsPanel(false);
    }
  }, [
    areFeaturePreviewsLoaded,
    closeCommentsPanel,
    commentsPanelOpen,
    isFolderResource,
    useOmniboxEditor,
  ]);

  useEffect(() => {
    if (copilotOpen) {
      setCopilotLayoutOpen(true);
      return;
    }
    const timer = window.setTimeout(
      () => setCopilotLayoutOpen(false),
      COPILOT_PANEL_TRANSITION_MS
    );
    return () => window.clearTimeout(timer);
  }, [copilotOpen]);

  const flushLayout = flush || copilotLayoutOpen;

  return (
    <ResourceTasksProvider
      namespaceId={namespaceId}
      resourceId={currentResource?.id ?? resourceId}
      resourceType={currentResource?.resource_type}
      onResource={currentResourceProps.onResource}
    >
      <SidebarInset
        className={cn(
          'h-full min-h-0 min-w-0 overflow-hidden rounded-[16px] bg-white dark:bg-background md:h-[calc(100svh-16px)]',
          compactResourcePane && 'resource-detail-view--compact',
          flushLayout ? 'm-0 md:h-full' : 'm-[8px]'
        )}
        style={
          {
            '--resource-toc-left': `${(open ? sidebarWidth : 0) + 16}px`,
          } as CSSProperties
        }
      >
        <Header {...currentResourceProps} onWide={onWide} wide={wide} />
        <Separator className="bg-[#F2F2F2] dark:bg-[#303132]" />
        <div
          className={cn(
            'no-scrollbar flex min-w-0 flex-1 justify-center overflow-x-hidden overflow-y-auto p-4',
            // Wide mode needs the default left padding so body clears the TOC rail.
            editPage && !wide && 'pl-2'
          )}
          data-resource-scroll
          ref={scrollContainerRef}
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
            <Wrapper
              {...currentResourceProps}
              error={error}
              showToc={!compactResourcePane}
              wide={wide}
            />
          </div>
        </div>
      </SidebarInset>
    </ResourceTasksProvider>
  );
}

export default function ResourceDetailView(props: ResourceDetailViewProps) {
  const commentsPanel = useResourceCommentsPanel();
  if (commentsPanel) {
    return <ResourceDetailContent {...props} />;
  }
  return (
    <ResourceCommentsProvider
      key={`${props.namespaceId}:${props.resourceId}`}
      namespaceId={props.namespaceId}
    >
      <ResourceDetailContent {...props} />
    </ResourceCommentsProvider>
  );
}
