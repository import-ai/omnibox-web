import { useNode } from '@/page/sidebar/store';

import { ResourceNodeContent } from './ResourceNodeContent';
import type { ResourceNodeProps } from './resourceNodeTypes';

export default function ResourceNode({
  nodeId,
  depth = 0,
  hasTeamspace,
  currentNamespace,
  onBatchDelete,
  onBatchMove,
  onBatchCreate,
  onAddToChat,
  renderChildren = true,
}: ResourceNodeProps) {
  const node = useNode(nodeId);
  if (!node) return null;
  return (
    <ResourceNodeContent
      node={node}
      nodeId={nodeId}
      depth={depth}
      renderChildren={renderChildren}
      hasTeamspace={hasTeamspace}
      currentNamespace={currentNamespace}
      onBatchDelete={onBatchDelete}
      onBatchMove={onBatchMove}
      onBatchCreate={onBatchCreate}
      onAddToChat={onAddToChat}
    />
  );
}
