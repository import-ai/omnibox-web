import { useEffect, useRef, useState } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { TouchBackend } from 'react-dnd-touch-backend';

import { SidebarContent } from '@/components/ui/sidebar';
import { useIsMobile } from '@/hooks/use-mobile';
import type { IResourceData, SpaceType } from '@/interface';
import group from '@/lib/group';
import { ISidebarProps } from '@/page/sidebar/types';
import { TrashPanel } from '@/page/trash';

import Space from './space-section';

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

  // Auto-scroll during drag: extends to sidebar header/footer and outside browser window
  useEffect(() => {
    const sidebarElement = sidebarRef.current;
    let scrollAnimId: number | null = null;
    let scrollStep = 0;
    let lastFrameTime = 0;
    let lastScrollDirection: number = 0; // -1 up, 0 none, 1 down
    let prevClientY: number | null = null;

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
      lastScrollDirection = 0;
      prevClientY = null;
    };
    const handleDrop = () => {
      clear(); // In some environments, dragend may not trigger
      stopAutoScroll();
      lastScrollDirection = 0;
      prevClientY = null;
    };
    const handleWindowBlur = () => {
      clear();
      stopAutoScroll();
    };
    const handleVisibilityChange = () => {
      if (document.hidden) {
        clear();
        stopAutoScroll();
      }
    };

    const handleDragOver = (e: DragEvent) => {
      if (!sidebarElement) return;
      const rect = sidebarElement.getBoundingClientRect();
      const clientY = e.clientY;

      const isAboveTop = clientY < rect.top + EDGE_SIZE;
      const isBelowBottom = clientY > rect.bottom - EDGE_SIZE;
      const isInsideRect = clientY >= rect.top && clientY <= rect.bottom;

      let nextScrollStep = 0;
      if (isAboveTop) nextScrollStep = -1;
      else if (isBelowBottom) nextScrollStep = 1;

      // When outside the sidebar content rect, only scroll if there is vertical movement
      if (nextScrollStep !== 0 && !isInsideRect) {
        if (prevClientY !== null && Math.abs(clientY - prevClientY) === 0) {
          // No vertical movement — keep scrolling if already active, but don't start
          if (scrollStep === 0) nextScrollStep = 0;
        }
      }

      if (nextScrollStep !== 0) {
        const changed = scrollStep !== nextScrollStep;
        scrollStep = nextScrollStep;
        lastScrollDirection = nextScrollStep;
        if (changed || scrollAnimId === null) {
          if (scrollAnimId !== null) cancelAnimationFrame(scrollAnimId);
          lastFrameTime = performance.now();
          scrollAnimId = requestAnimationFrame(tick);
        }
      } else {
        stopAutoScroll();
      }

      prevClientY = clientY;
    };

    const handleDragLeave = (e: DragEvent) => {
      // Cursor left the browser window — keep scrolling in last known direction
      if (!e.relatedTarget && lastScrollDirection !== 0 && scrollStep === 0) {
        scrollStep = lastScrollDirection;
        lastFrameTime = performance.now();
        scrollAnimId = requestAnimationFrame(tick);
      }
    };

    document.addEventListener('dragover', handleDragOver);
    document.addEventListener('dragleave', handleDragLeave);
    document.addEventListener('dragend', handleDragEnd);
    document.addEventListener('drop', handleDrop);
    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('dragover', handleDragOver);
      document.removeEventListener('dragleave', handleDragLeave);
      document.removeEventListener('dragend', handleDragEnd);
      document.removeEventListener('drop', handleDrop);
      window.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
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
