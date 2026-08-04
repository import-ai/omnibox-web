import { Namespace, SpaceType } from '@/interface';
import type { SmartFolderOwnerScope } from '@/page/sidebar/components/smart-folder';
import {
  useIsSpaceExpanded,
  useNode,
  useRootId,
  useSidebarStore,
} from '@/page/sidebar/store';
import type { ResourceSortOptions } from '@/service/resource';

import { SpaceSectionContent } from './SpaceSectionContent';

interface SpaceSectionProps {
  spaceType: SpaceType;
  namespaceId: string;
  hasTeamspace: boolean;
  currentNamespace?: Namespace;
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

export default function SpaceSection({
  spaceType,
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
}: SpaceSectionProps) {
  const rootId = useRootId(spaceType);
  const rootNode = useNode(rootId);
  const isOpen = useIsSpaceExpanded(spaceType);
  const resourceSort = useSidebarStore(state => state.resourceSorts[spaceType]);

  if (!rootNode) {
    return null;
  }

  return (
    <SpaceSectionContent
      rootNode={rootNode}
      spaceType={spaceType}
      namespaceId={namespaceId}
      rootId={rootId}
      isOpen={isOpen}
      hasTeamspace={hasTeamspace}
      currentNamespace={currentNamespace}
      onBatchDelete={onBatchDelete}
      onBatchMove={onBatchMove}
      onBatchCreate={onBatchCreate}
      onAddToChat={onAddToChat}
      onCreateSmartFolder={onCreateSmartFolder}
      onCreateRssFolder={onCreateRssFolder}
      smartFolderQuotaExhausted={smartFolderQuotaExhausted}
      resourceSort={resourceSort}
      sorting={sortingSpace === spaceType}
      onResourceSortChange={sort => onResourceSortChange(spaceType, sort)}
    />
  );
}
