import {
  useIsSpaceExpanded,
  useNode,
  useRootId,
} from '@/page/share/sidebar/store';

import { ResourceTreeProps } from './ResourceNode';
import { SpaceSectionContent } from './SpaceSectionContent';

export default function SpaceSection(props: ResourceTreeProps) {
  const rootId = useRootId('share');
  const rootNode = useNode(rootId);
  const isOpen = useIsSpaceExpanded('share');

  if (!rootNode) {
    return null;
  }

  return (
    <SpaceSectionContent
      rootNode={rootNode}
      isOpen={isOpen}
      shareId={props.shareId}
      showChat={props.showChat}
      isChatActive={props.isChatActive}
      isResourceActive={props.isResourceActive}
      onAddToContext={props.onAddToContext}
      canBrowseResources={props.canBrowseResources}
    />
  );
}
