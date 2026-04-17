import { useEffect, useRef, useState } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { TouchBackend } from 'react-dnd-touch-backend';

import { SidebarContent } from '@/components/ui/sidebar';
import { useIsMobile } from '@/hooks/use-mobile';
import type { IResourceData, SpaceType } from '@/interface';
import group from '@/lib/group';
import { ISidebarProps } from '@/page/sidebar/interface';
import { TrashPanel } from '@/page/sidebar/trash';

import Space from './space';

// Auto-scroll trigger zone
const EDGE_SIZE = 60;
const MAX_SCROLL_SPEED = 600; // px per second

export interface IProps extends Omit<
  ISidebarProps,
  'spaceType' | 'data' | 'open'
> {
  data: {
    [index: string]: IResourceData;
  };
  openSpaces: Record<string, boolean>;
  onDrop: (item: IResourceData, target: IResourceData | null) => void;
  onRename: (id: string, newName: string) => Promise<void>;
}

export default function Content(props: IProps) {
  const { data, resourceId, progress, onDrop, openSpaces } = props;
  const isMobile = useIsMobile();
  const [target, onTarget] = useState<IResourceData | null>(null);
  const [fileDragTarget, setFileDragTarget] = useState<string | null>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const handleDrop = (resource: IResourceData, item: IResourceData | null) => {
    onDrop(resource, item);
    onTarget(null);
  };

  // Fallback cleanup: Ensure fileDragTarget is cleared when drag ends, focus is lost, page is hidden, or when leaving the sidebar
  useEffect(() => {
    const sidebarElement = sidebarRef.current;
    let scrollAnimId: number | null = null;
    let scrollStep = 0;
    let lastFrameTime = 0;

    const stopAutoScroll = () => {
      if (scrollAnimId !== null) {
        cancelAnimationFrame(scrollAnimId);
        scrollAnimId = null;
      }
      scrollStep = 0;
    };

    const tick = () => {
      if (!sidebarElement || scrollStep === 0) return;
      const now = performance.now();
      const dt = lastFrameTime
        ? Math.min((now - lastFrameTime) / 1000, 0.1)
        : 0;
      lastFrameTime = now;
      sidebarElement.scrollTop += scrollStep * MAX_SCROLL_SPEED * dt;
      scrollAnimId = requestAnimationFrame(tick);
    };

    const clear = () => setFileDragTarget(null);
    const handleDragEnd = () => {
      clear();
      stopAutoScroll();
    };
    const handleDrop = () => {
      clear(); // In some environments, dragend may not trigger
      stopAutoScroll();
    };
    const handleWindowBlur = () => clear();
    const handleVisibilityChange = () => {
      if (document.hidden) clear();
    };

    const handleDragOver = (e: DragEvent) => {
      if (!sidebarElement) return;
      const rect = sidebarElement.getBoundingClientRect();
      const y = e.clientY - rect.top;
      let nextScrollStep = 0;

      if (y >= 0 && y < EDGE_SIZE) {
        nextScrollStep = -1;
      } else if (y > rect.height - EDGE_SIZE && y <= rect.height) {
        nextScrollStep = 1;
      }

      if (nextScrollStep !== 0) {
        const changed = scrollStep !== nextScrollStep;
        scrollStep = nextScrollStep;
        if (changed || scrollAnimId === null) {
          if (scrollAnimId !== null) cancelAnimationFrame(scrollAnimId);
          lastFrameTime = performance.now();
          scrollAnimId = requestAnimationFrame(tick);
        }
      } else {
        stopAutoScroll();
      }
    };

    const handleDragLeave = (e: DragEvent) => {
      // Only clear when completely leaving the sidebar (not just switching between child elements)
      if (
        !e.relatedTarget ||
        !sidebarElement?.contains(e.relatedTarget as Node)
      ) {
        clear();
        stopAutoScroll();
      }
    };

    document.addEventListener('dragend', handleDragEnd);
    document.addEventListener('drop', handleDrop);
    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    if (sidebarElement) {
      sidebarElement.addEventListener('dragover', handleDragOver);
      sidebarElement.addEventListener('dragleave', handleDragLeave);
    }

    return () => {
      document.removeEventListener('dragend', handleDragEnd);
      document.removeEventListener('drop', handleDrop);
      window.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (sidebarElement) {
        sidebarElement.removeEventListener('dragover', handleDragOver);
        sidebarElement.removeEventListener('dragleave', handleDragLeave);
      }
      stopAutoScroll();
    };
  }, []);

  return (
    <DndProvider backend={isMobile ? TouchBackend : HTML5Backend}>
      <SidebarContent ref={sidebarRef} className="gap-0 no-scrollbar">
        {Object.keys(data)
          .sort()
          .map((spaceType: string) => (
            <Space
              {...props}
              key={spaceType}
              target={target}
              progress={progress}
              onTarget={onTarget}
              onDrop={handleDrop}
              activeKey={resourceId}
              data={group(data[spaceType])}
              spaceType={spaceType as SpaceType}
              open={openSpaces[spaceType] !== false}
              fileDragTarget={fileDragTarget}
              onFileDragTarget={setFileDragTarget}
            />
          ))}
        <TrashPanel />
      </SidebarContent>
    </DndProvider>
  );
}
