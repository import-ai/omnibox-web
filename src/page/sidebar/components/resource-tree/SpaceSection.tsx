import { Namespace, SpaceType } from '@/interface';
import type { SmartFolderOwnerScope } from '@/page/sidebar/components/smart-folder';
import { useIsSpaceExpanded, useNode, useRootId } from '@/page/sidebar/store';

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
  smartFolderQuotaExhausted: Partial<Record<SmartFolderOwnerScope, boolean>>;
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
  smartFolderQuotaExhausted,
}: SpaceSectionProps) {
  const rootId = useRootId(spaceType);
  const rootNode = useNode(rootId);
  const isOpen = useIsSpaceExpanded(spaceType);

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
      smartFolderQuotaExhausted={smartFolderQuotaExhausted}
    />
  );
}
