import { Namespace } from '@/interface';
import { useNode } from '@/page/sidebar/store';

import { ResourceNodeContent } from './ResourceNodeContent';

interface ResourceNodeProps {
  nodeId: string;
  depth?: number;
  hasTeamspace: boolean;
  currentNamespace?: Namespace;
}

export default function ResourceNode({
  nodeId,
  depth = 0,
  hasTeamspace,
  currentNamespace,
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
    />
  );
}
