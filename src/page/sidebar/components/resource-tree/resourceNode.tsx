import { Namespace } from '@/interface';
import { useNode } from '@/page/sidebar/store';

import { ResourceNodeContent } from './ResourceNodeContent';

interface ResourceNodeProps {
  nodeId: string;
  hasTeamspace: boolean;
  currentNamespace?: Namespace;
}

export default function ResourceNode({
  nodeId,
  hasTeamspace,
  currentNamespace,
}: ResourceNodeProps) {
  const node = useNode(nodeId);
  if (!node) return null;
  return (
    <ResourceNodeContent
      node={node}
      nodeId={nodeId}
      hasTeamspace={hasTeamspace}
      currentNamespace={currentNamespace}
    />
  );
}
