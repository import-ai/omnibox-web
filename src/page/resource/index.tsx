import { type CSSProperties, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';

import { Separator } from '@/components/ui/Separator';
import { SidebarInset, useSidebar } from '@/components/ui/Sidebar';
import useApp from '@/hooks/useApp';
import useResource from '@/hooks/userResource';
import useWide from '@/hooks/useWide';
import { cn } from '@/lib/utils';
import {
  getCopilotWorkspace,
  useCopilotStore,
} from '@/page/copilot/copilotStore';
import {
  selectUseOmniboxEditor,
  useResourceStore,
} from '@/page/resource/resourceStore';
import { useResourceBodyDragAutoScroll } from '@/page/resource/useResourceBodyDragAutoScroll';

import Header from './header';
import Wrapper from './Wrapper';

export default function ResourcePage() {
  const { wide, onWide } = useWide();
  const props = useResource();
  const { open, width: sidebarWidth } = useSidebar();
  const params = useParams();
  const namespaceId = params.namespace_id || '';
  const copilotOpen = useCopilotStore(
    state => getCopilotWorkspace(state, namespaceId).open
  );
  const [large, onLarge] = useState(window.innerWidth > 1500);
  const [rssItemCopyContent, setRssItemCopyContent] = useState<{
    itemId: string;
    content: string | null | undefined;
  }>();
  const app = useApp();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const useOmniboxEditor = useResourceStore(selectUseOmniboxEditor);
  const isOmniboxResource =
    useOmniboxEditor &&
    !!props.resource &&
    props.resource.resource_type !== 'folder' &&
    props.resource.resource_type !== 'smart_folder' &&
    props.resource.resource_type !== 'rss_folder';
  const useFullWidth = isOmniboxResource;

  useResourceBodyDragAutoScroll(
    scrollContainerRef,
    useFullWidth && props.editPage
  );

  useEffect(() => {
    function handleSize() {
      onLarge(window.innerWidth > 1500);
    }
    window.addEventListener('resize', handleSize);
    return () => {
      window.removeEventListener('resize', handleSize);
    };
  }, []);

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
      const scrollThreshold = 100;

      if (scrollHeight - scrollTop - clientHeight < scrollThreshold) {
        app.fire('scroll-to-bottom');
      }
    };

    scrollContainer.addEventListener('scroll', handleScroll);

    return () => {
      scrollContainer.removeEventListener('scroll', handleScroll);
    };
  }, [app]);

  return (
    <SidebarInset
      className={cn(
        'bg-white rounded-[16px] dark:bg-background min-h-0 h-full md:h-[calc(100svh-16px)] min-w-0 overflow-hidden',
        // Workspace already provides p-2 + gap-2 when Copilot is open.
        copilotOpen ? 'm-0 md:h-full' : 'm-[8px]'
      )}
      style={
        {
          '--resource-toc-left': `${(open ? sidebarWidth : 0) + 16}px`,
        } as CSSProperties
      }
    >
      <Header
        {...props}
        wide={wide}
        onWide={onWide}
        rssItemCopyContent={rssItemCopyContent}
      />
      <Separator className="bg-[#F2F2F2] dark:bg-[#303132]" />
      <div
        ref={scrollContainerRef}
        className={cn(
          'no-scrollbar flex min-w-0 flex-1 justify-center overflow-y-auto overflow-x-hidden p-4',
          // Pull the Omnibox TOC flush toward the app sidebar.
          useFullWidth && 'pl-2'
        )}
      >
        <div
          className={cn('flex min-w-0 w-full max-w-full flex-col', {
            'max-w-[680px]': !wide && !useFullWidth && (open || !large),
            'max-w-[800px]': !wide && !useFullWidth && (!open || large),
          })}
          style={
            useFullWidth
              ? { maxWidth: '100%' }
              : wide
                ? { maxWidth: '80rem' }
                : undefined
          }
        >
          <Wrapper
            {...props}
            wide={wide}
            onRssItemCopyContentChange={setRssItemCopyContent}
          />
        </div>
      </div>
    </SidebarInset>
  );
}
