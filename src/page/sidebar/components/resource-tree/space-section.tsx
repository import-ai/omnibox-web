import { SpaceType } from '@/interface';
import { useIsSpaceExpanded, useNode, useRootId } from '@/page/sidebar/store';

import { SpaceSectionContent } from './space-section-content';

interface SpaceSectionProps {
  spaceType: SpaceType;
  namespaceId: string;
}

export default function SpaceSection({
  spaceType,
  namespaceId,
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
    />
  );
}
