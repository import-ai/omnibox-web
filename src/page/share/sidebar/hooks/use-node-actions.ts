import { useLocation, useNavigate } from 'react-router-dom';

import { ResourceMeta } from '@/interface';
import { useNode } from '@/page/share/sidebar/store';

interface UseNodeActionsProps {
  nodeId: string;
  shareId: string;
  isChatActive: boolean;
  onAddToContext: (resource: ResourceMeta, type: 'resource' | 'folder') => void;
}

export interface UseNodeActionsReturn {
  node: ReturnType<typeof useNode>;
  handleAddToChat: () => void;
  handleAddAllToChat: () => void;
}

export function useNodeActions(
  props: UseNodeActionsProps
): UseNodeActionsReturn {
  const { nodeId, shareId, isChatActive, onAddToContext } = props;
  const navigate = useNavigate();
  const node = useNode(nodeId);

  const loc = useLocation();
  const addToContext = (type: 'resource' | 'folder') => {
    const doAdd = () => {
      if (!node) return;
      onAddToContext(
        {
          id: node.id,
          name: node.name,
          parent_id: node.parentId,
          resource_type: node.resourceType,
          attrs: node.attrs,
          has_children: node.hasChildren,
        },
        type
      );
    };
    if (isChatActive || loc.pathname.includes('/chat')) {
      doAdd();
    } else {
      navigate(`/s/${shareId}/chat`);
      setTimeout(doAdd, 100);
    }
  };

  const handleAddToChat = () => addToContext('resource');
  const handleAddAllToChat = () => addToContext('folder');

  return {
    node,
    handleAddToChat,
    handleAddAllToChat,
  };
}
