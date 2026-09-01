import { useRef } from 'react';
import { createPortal } from 'react-dom';

import { SidebarContent } from '@/components/ui/Sidebar';
import { Namespace, SpaceType } from '@/interface';
import type { SmartFolderOwnerScope } from '@/page/sidebar/components/smart-folder';
import { SidebarDragLayer } from '@/page/sidebar/hooks/UseBatchDrag';
import { useDragAutoScroll } from '@/page/sidebar/hooks/useDragAutoScroll';
import { RESOURCE_TREE_INDENT } from '@/page/sidebar/manualDropIndicator';
import type { RssFolderQuotaExhausted } from '@/page/sidebar/rssFolderQuota';
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
  rssFolderQuotaExhausted: RssFolderQuotaExhausted;
  sortingSpace: SpaceType | null;
  onResourceSortChange: (
    spaceType: SpaceType,
    sort: ResourceSortOptions
  ) => void;
}

function ManualDropLine() {
  const line = useSidebarStore(state => state.manualDropIndicator?.line);
  if (!line) return null;

  const arrowOffset = Math.min(line.arrowOffset, Math.max(0, line.width - 6));

  return createPortal(
    <span
      aria-hidden="true"
      className="pointer-events-none fixed z-[9998] h-0.5"
      style={{
        left: line.left,
        top: line.top,
        width: line.width,
      }}
    >
      {Array.from({ length: line.guideCount }, (_, index) => {
        const guideOffset = Math.max(
          0,
          arrowOffset - (index + 1) * RESOURCE_TREE_INDENT
        );
        return (
          <span
            key={index}
            className="absolute top-0 h-0.5 bg-blue-200 before:absolute before:-top-[3px] before:left-0 before:h-2 before:w-0.5 before:bg-blue-200"
            style={{
              left: guideOffset,
              width: Math.max(0, arrowOffset - guideOffset - 4),
            }}
          />
        );
      })}
      <span
        className="absolute -top-[3px] size-0 border-y-4 border-l-[6px] border-y-transparent border-l-blue-500"
        style={{ left: arrowOffset }}
      />
      <span
        className="absolute right-0 top-0 h-0.5 bg-blue-500"
        style={{ left: arrowOffset + 6 }}
      />
    </span>,
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
  rssFolderQuotaExhausted,
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
            rssFolderQuotaExhausted={rssFolderQuotaExhausted}
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
