import { useRef } from 'react';
import { createPortal } from 'react-dom';

import { SidebarContent } from '@/components/ui/Sidebar';
import { Namespace, SpaceType } from '@/interface';
import type { SmartFolderOwnerScope } from '@/page/sidebar/components/smart-folder';
import { SidebarDragLayer } from '@/page/sidebar/hooks/UseBatchDrag';
import { useDragAutoScroll } from '@/page/sidebar/hooks/useDragAutoScroll';
import { useSidebarStore } from '@/page/sidebar/store';
import { TrashPanel } from '@/page/trash';
import type { ResourceSortOptions } from '@/service/resource';

import SpaceSection from './SpaceSection';

interface ResourceTreeProps {
  namespaceId: string;
  hasTeamspace: boolean;
  currentNamespace: Namespace | undefined;
  onBatchDelete: () => void;
  onBatchMove: () => void;
  onBatchCreate: () => void;
  onAddToChat: () => void;
  onCreateSmartFolder: (ownerScope: SmartFolderOwnerScope) => void;
  onCreateRssFolder: (spaceType: SpaceType) => void;
  smartFolderQuotaExhausted: Partial<Record<SmartFolderOwnerScope, boolean>>;
  sortingSpace: SpaceType | null;
  onResourceSortChange: (
    spaceType: SpaceType,
    sort: ResourceSortOptions
  ) => void;
}

function ManualDropLine() {
  const line = useSidebarStore(state => state.manualDropIndicator?.line);
  if (!line) return null;

  return createPortal(
    <span
      className="pointer-events-none fixed z-[9998] h-1 bg-blue-300"
      style={{
        left: line.left,
        top: line.top,
        width: line.width,
      }}
    />,
    document.body
  );
}

export default function ResourceTree({
  namespaceId,
  hasTeamspace,
  currentNamespace,
  onBatchDelete,
  onBatchMove,
  onBatchCreate,
  onAddToChat,
  onCreateSmartFolder,
  onCreateRssFolder,
  smartFolderQuotaExhausted,
  sortingSpace,
  onResourceSortChange,
}: ResourceTreeProps) {
  const sidebarRef = useRef<HTMLDivElement>(null);

  useDragAutoScroll(sidebarRef);

  return (
    <>
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
            onCreateSmartFolder={onCreateSmartFolder}
            onCreateRssFolder={onCreateRssFolder}
            smartFolderQuotaExhausted={smartFolderQuotaExhausted}
            sortingSpace={sortingSpace}
            onResourceSortChange={onResourceSortChange}
          />
        ))}
        <TrashPanel />
      </SidebarContent>
      <ManualDropLine />
      <SidebarDragLayer />
    </>
  );
}
