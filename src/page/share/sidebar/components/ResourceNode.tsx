import { ResourceMeta } from '@/interface';
import { useNode } from '@/page/share/sidebar/store';

import { ResourceNodeContent } from './ResourceNodeContent';

export interface ResourceTreeProps {
  shareId: string;
  showChat: boolean;
  isChatActive: boolean;
  isResourceActive: (resourceId: string) => boolean;
  onAddToContext: (resource: ResourceMeta, type: 'resource' | 'folder') => void;
  canBrowseResources: boolean;
}

interface ResourceNodeProps extends ResourceTreeProps {
  depth?: number;
  nodeId: string;
  renderChildren?: boolean;
}

export default function ResourceNode({
  nodeId,
  depth = 0,
  renderChildren = true,
  ...props
}: ResourceNodeProps) {
  const node = useNode(nodeId);
  if (!node) return null;
  return (
    <ResourceNodeContent
      node={node}
      nodeId={nodeId}
      depth={depth}
      renderChildren={renderChildren}
      {...props}
    />
  );
}
