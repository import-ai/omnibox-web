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
}: ResourceNodeProps) {
  const node = useNode(nodeId);
  if (!node) return null;
  return (
    <ResourceNodeContent
      node={node}
      nodeId={nodeId}
      depth={depth}
      hasTeamspace={hasTeamspace}
      currentNamespace={currentNamespace}
      onBatchDelete={onBatchDelete}
      onBatchMove={onBatchMove}
      onBatchCreate={onBatchCreate}
      onAddToChat={onAddToChat}
    />
  );
}
