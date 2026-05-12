import { Namespace } from '@/interface';
import { useNodeActions } from '@/page/sidebar/hooks/use-node-actions';

import { NodeActionsContent } from './node-actions-content';

interface NodeActionsProps {
  nodeId: string;
  namespaceId: string;
  upload?: string;
  hasTeamspace: boolean;
  currentNamespace?: Namespace;
  onRename?: () => void;
}

export default function NodeActions({
  nodeId,
  namespaceId,
  upload,
  hasTeamspace,
  currentNamespace,
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
      hasTeamspace={hasTeamspace}
      currentNamespace={currentNamespace}
      onRename={onRename}
    />
  );
}
