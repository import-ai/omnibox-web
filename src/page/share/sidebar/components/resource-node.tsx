import { ResourceMeta } from '@/interface';
import { useNode } from '@/page/share/sidebar/store';

import { ResourceNodeContent } from './resource-node-content';

export interface ResourceTreeProps {
  shareId: string;
  showChat: boolean;
  isChatActive: boolean;
  isResourceActive: (resourceId: string) => boolean;
  onAddToContext: (resource: ResourceMeta, type: 'resource' | 'folder') => void;
}

interface ResourceNodeProps extends ResourceTreeProps {
  nodeId: string;
}

export default function ResourceNode({ nodeId, ...props }: ResourceNodeProps) {
  const node = useNode(nodeId);
  if (!node) return null;
  return <ResourceNodeContent node={node} nodeId={nodeId} {...props} />;
}
