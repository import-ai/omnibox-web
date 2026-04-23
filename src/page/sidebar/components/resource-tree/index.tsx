import { ReactNode, useRef } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { TouchBackend } from 'react-dnd-touch-backend';

import { SidebarContent } from '@/components/ui/sidebar';
import { useIsMobile } from '@/hooks/use-mobile';
import { SpaceType } from '@/interface';
import { useDragAutoScroll } from '@/page/sidebar/hooks/use-drag-auto-scroll';

import SpaceSection from './space-section';

interface ResourceTreeProps {
  namespaceId: string;
  children: ReactNode;
}

export default function ResourceTree({
  children,
  namespaceId,
}: ResourceTreeProps) {
  const isMobile = useIsMobile();
  const sidebarRef = useRef<HTMLDivElement>(null);

  useDragAutoScroll(sidebarRef);

  return (
    <DndProvider backend={isMobile ? TouchBackend : HTML5Backend}>
      <SidebarContent ref={sidebarRef} className="no-scrollbar gap-0">
        {(['private', 'teamspace'] as SpaceType[]).map(spaceType => (
          <SpaceSection
            key={spaceType}
            spaceType={spaceType}
            namespaceId={namespaceId}
          />
        ))}
        {children}
      </SidebarContent>
    </DndProvider>
  );
}
