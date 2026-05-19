import { useNode } from '@/page/sidebar/store';

import { ResourceNodeContent } from './resourceNodeContent';

interface ResourceNodeProps {
  nodeId: string;
  depth?: number;
}

export default function ResourceNode({ nodeId, depth = 0 }: ResourceNodeProps) {
  const node = useNode(nodeId);
  if (!node) return null;
  return <ResourceNodeContent node={node} nodeId={nodeId} depth={depth} />;
}
