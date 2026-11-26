import type { Namespace } from '@/interface';
import { useNodeActions } from '@/page/sidebar/hooks/useNodeActions';

import { NodeActionsContent } from './NodeActionsContent';

interface NodeActionsProps {
  nodeId: string;
  namespaceId: string;
  currentNamespace?: Namespace;
  upload?: string;
  onRename?: () => void;
}

export default function NodeActions({
  nodeId,
  namespaceId,
  currentNamespace,
  upload,
  onRename,
}: NodeActionsProps) {
  const actions = useNodeActions(nodeId, namespaceId, currentNamespace);
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
