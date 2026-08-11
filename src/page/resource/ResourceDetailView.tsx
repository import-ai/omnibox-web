import { type CSSProperties, useEffect, useRef, useState } from 'react';

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

import Header from './header';
import Wrapper from './Wrapper';

interface ResourceDetailViewProps extends IUseResource {
  error?: boolean;
  flush?: boolean;
  rssItemId: string | null;
}

/** Shared visual shell for routed resources and in-place Copilot previews. */
export default function ResourceDetailView({
  error = false,
  flush = false,
  rssItemId,
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
      (Boolean(resourceId) &&
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
  const [large, setLarge] = useState(window.innerWidth > 1500);
  const [rssItemCopyContent, setRssItemCopyContent] = useState<{
    itemId: string;
    content: string | null | undefined;
  }>();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const useOmniboxEditor = useResourceStore(selectUseOmniboxEditor);
  const useFullWidth =
    useOmniboxEditor &&
    !!currentResource &&
    currentResource.resource_type !== 'folder' &&
    currentResource.resource_type !== 'smart_folder' &&
    currentResource.resource_type !== 'rss_folder';

  useResourceBodyDragAutoScroll(scrollContainerRef, useFullWidth && editPage);

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

  useEffect(() => {
    function handleSize() {
      setLarge(window.innerWidth > 1500);
    }
    window.addEventListener('resize', handleSize);
    return () => window.removeEventListener('resize', handleSize);
  }, []);

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
      if (scrollHeight - scrollTop - clientHeight < 100) {
        app.fire('scroll-to-bottom');
      }
    };

    scrollContainer.addEventListener('scroll', handleScroll);
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, [app]);

  const flushLayout = flush || copilotLayoutOpen;

  return (
    <SidebarInset
      className={cn(
        'h-full min-h-0 min-w-0 overflow-hidden rounded-[16px] bg-white dark:bg-background md:h-[calc(100svh-16px)]',
        flushLayout ? 'm-0 md:h-full' : 'm-[8px]'
      )}
      style={
        {
          '--resource-toc-left': `${(open ? sidebarWidth : 0) + 16}px`,
        } as CSSProperties
      }
    >
      <Header
        {...currentResourceProps}
        onWide={onWide}
        rssItemCopyContent={rssItemCopyContent}
        rssItemId={rssItemId}
        wide={wide}
      />
      <Separator className="bg-[#F2F2F2] dark:bg-[#303132]" />
      <div
        className={cn(
          'no-scrollbar flex min-w-0 flex-1 justify-center overflow-x-hidden overflow-y-auto p-4',
          // Wide mode needs the default left padding so body clears the TOC rail.
          editPage && !wide && 'pl-2'
        )}
        ref={scrollContainerRef}
      >
        <div
          className={cn('flex w-full min-w-0 max-w-full flex-col', {
            'max-w-[680px]': !wide && !useFullWidth && (open || !large),
            'max-w-[800px]': !wide && !useFullWidth && (!open || large),
            'max-w-7xl': wide,
          })}
          style={!wide && useFullWidth ? { maxWidth: '100%' } : undefined}
        >
          <Wrapper
            {...currentResourceProps}
            error={error}
            onRssItemCopyContentChange={setRssItemCopyContent}
            rssItemId={rssItemId}
            wide={wide}
          />
        </div>
      </div>
    </SidebarInset>
  );
}
