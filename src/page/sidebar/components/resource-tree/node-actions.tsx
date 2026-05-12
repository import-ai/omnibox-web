import { useNodeActions } from '@/page/sidebar/hooks/use-node-actions';

import { NodeActionsContent } from './node-actions-content';

interface NodeActionsProps {
  nodeId: string;
  namespaceId: string;
  upload?: string;
  onRename?: () => void;
}

export default function NodeActions({
  nodeId,
  namespaceId,
  upload,
  onRename,
}: NodeActionsProps) {
  const actions = useNodeActions(nodeId, namespaceId);
  if (!actions.node) return null;

  return (
    <NodeActionsContent
      nodeId={nodeId}
      namespaceId={namespaceId}
      node={actions.node}
      actions={actions}
      upload={upload}
      onRename={onRename}
    />
  );
}
