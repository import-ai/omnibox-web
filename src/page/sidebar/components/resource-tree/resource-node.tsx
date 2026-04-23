import { useNode } from '@/page/sidebar/store';

import { ResourceNodeContent } from './resource-node-content';

interface ResourceNodeProps {
  nodeId: string;
}

export default function ResourceNode({ nodeId }: ResourceNodeProps) {
  const node = useNode(nodeId);
  if (!node) return null;
  return <ResourceNodeContent node={node} nodeId={nodeId} />;
}
