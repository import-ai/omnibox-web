import { useNodeActions } from '@/page/share/sidebar/hooks/use-node-actions';

import { NodeActionsContent } from './node-actions-content';
import { ResourceTreeProps } from './resource-node';

interface NodeActionsProps extends Pick<
  ResourceTreeProps,
  'isChatActive' | 'onAddToContext'
> {
  nodeId: string;
  shareId: string;
}

export default function NodeActions(props: NodeActionsProps) {
  const actions = useNodeActions(props);
  if (!actions.node) return null;

  return <NodeActionsContent actions={actions} />;
}
