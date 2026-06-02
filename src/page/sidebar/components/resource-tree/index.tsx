import { useRef } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { TouchBackend } from 'react-dnd-touch-backend';

import { SidebarContent } from '@/components/ui/Sidebar';
import { useIsMobile } from '@/hooks/useMobile';
import { Namespace, SpaceType } from '@/interface';
import { SidebarDragLayer } from '@/page/sidebar/hooks/UseBatchDrag';
import { useDragAutoScroll } from '@/page/sidebar/hooks/useDragAutoScroll';
import { TrashPanel } from '@/page/trash';

import SpaceSection from './SpaceSection';

interface ResourceTreeProps {
  namespaceId: string;
  hasTeamspace: boolean;
  currentNamespace: Namespace | undefined;
  onBatchDelete: () => void;
  onBatchMove: () => void;
  onBatchCreate: () => void;
  onAddToChat: () => void;
}

export default function ResourceTree({
  namespaceId,
  hasTeamspace,
  currentNamespace,
  onBatchDelete,
  onBatchMove,
  onBatchCreate,
  onAddToChat,
}: ResourceTreeProps) {
  const isMobile = useIsMobile();
  const sidebarRef = useRef<HTMLDivElement>(null);

  useDragAutoScroll(sidebarRef);

  return (
    <DndProvider backend={isMobile ? TouchBackend : HTML5Backend}>
      <SidebarContent
        ref={sidebarRef}
        className="no-scrollbar gap-0 overflow-x-hidden"
      >
        {(['private', 'teamspace'] as SpaceType[]).map(spaceType => (
          <SpaceSection
            key={spaceType}
            spaceType={spaceType}
            namespaceId={namespaceId}
            hasTeamspace={hasTeamspace}
            currentNamespace={currentNamespace}
            onBatchDelete={onBatchDelete}
            onBatchMove={onBatchMove}
            onBatchCreate={onBatchCreate}
            onAddToChat={onAddToChat}
          />
        ))}
        <TrashPanel />
      </SidebarContent>
      <SidebarDragLayer />
    </DndProvider>
  );
}
