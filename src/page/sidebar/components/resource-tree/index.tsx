import { useRef } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { TouchBackend } from 'react-dnd-touch-backend';

import { SidebarContent } from '@/components/ui/sidebar';
import { Skeleton } from '@/components/ui/skeleton';
import { useIsMobile } from '@/hooks/use-mobile';
import { SpaceType } from '@/interface';
import { useDragAutoScroll } from '@/page/sidebar/hooks/use-drag-auto-scroll';
import { useSidebarStore } from '@/page/sidebar/store';
import { TrashPanel } from '@/page/trash';

import SpaceSection from './space-section';

interface ResourceTreeProps {
  namespaceId: string;
}

export default function ResourceTree({ namespaceId }: ResourceTreeProps) {
  const isMobile = useIsMobile();
  const sidebarRef = useRef<HTMLDivElement>(null);
  const initialized = useSidebarStore(
    s => s.rootIds.private !== '' || s.rootIds.teamspace !== ''
  );

  useDragAutoScroll(sidebarRef);

  return (
    <DndProvider backend={isMobile ? TouchBackend : HTML5Backend}>
      <SidebarContent ref={sidebarRef} className="no-scrollbar gap-0">
        {initialized ? (
          (['private', 'teamspace'] as SpaceType[]).map(spaceType => (
            <SpaceSection
              key={spaceType}
              spaceType={spaceType}
              namespaceId={namespaceId}
            />
          ))
        ) : (
          <div className="space-y-4 px-2 py-1">
            {[0, 1].map(section => (
              <div key={section} className="space-y-2">
                <Skeleton className="h-5 w-16" />
                <div className="space-y-1 pl-5">
                  <Skeleton className="h-7 w-[82%]" />
                  <Skeleton className="h-7 w-[68%]" />
                  <Skeleton className="h-7 w-[76%]" />
                </div>
              </div>
            ))}
          </div>
        )}
        <TrashPanel />
      </SidebarContent>
    </DndProvider>
  );
}
