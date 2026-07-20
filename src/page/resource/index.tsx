import { useEffect, useRef, useState } from 'react';

import { Separator } from '@/components/ui/Separator';
import { SidebarInset, useSidebar } from '@/components/ui/Sidebar';
import useApp from '@/hooks/useApp';
import useResource from '@/hooks/userResource';
import useWide from '@/hooks/useWide';
import { cn } from '@/lib/utils';
import { OMNIBOX_EDITOR_CONTENT_WIDTH } from '@/page/resource/editor/const';
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
  const { open } = useSidebar();
  const [large, onLarge] = useState(window.innerWidth > 1500);
  const app = useApp();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const useOmniboxEditor = useResourceStore(selectUseOmniboxEditor);
  const isOmniboxResource =
    useOmniboxEditor &&
    !!props.resource &&
    props.resource.resource_type !== 'folder' &&
    props.resource.resource_type !== 'smart_folder';
  // Edit mode needs full width so the TOC can sit in the left gutter.
  // View mode keeps the original centered content width.
  const useFullWidthForEdit = isOmniboxResource && props.editPage;
  const useEditorContentWidth = isOmniboxResource && !props.editPage;

  // Editor body only — do not share listeners with sidebar tree DnD.
  useResourceBodyDragAutoScroll(scrollContainerRef, useFullWidthForEdit);

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
    <SidebarInset className="m-[8px] bg-white rounded-[16px] dark:bg-background min-h-0 h-full md:h-[calc(100svh-16px)] min-w-0 overflow-hidden">
      <Header {...props} wide={wide} onWide={onWide} />
      <Separator className="bg-[#F2F2F2] dark:bg-[#303132]" />
      <div
        ref={scrollContainerRef}
        className="no-scrollbar flex min-w-0 flex-1 justify-center overflow-y-auto overflow-x-hidden p-4"
      >
        <div
          className={cn('flex min-w-0 w-full max-w-full flex-col', {
            'max-w-[680px]':
              !wide &&
              !useEditorContentWidth &&
              !useFullWidthForEdit &&
              (open || !large),
            'max-w-[800px]':
              !wide &&
              !useEditorContentWidth &&
              !useFullWidthForEdit &&
              (!open || large),
            'max-w-7xl': wide,
          })}
          style={
            !wide && useFullWidthForEdit
              ? { maxWidth: '100%' }
              : !wide && useEditorContentWidth
                ? { maxWidth: OMNIBOX_EDITOR_CONTENT_WIDTH }
                : undefined
          }
        >
          <Wrapper {...props} />
        </div>
      </div>
    </SidebarInset>
  );
}
