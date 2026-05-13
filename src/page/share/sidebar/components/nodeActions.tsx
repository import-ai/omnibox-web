import { useNodeActions } from '@/page/share/sidebar/hooks/useNodeActions';

import { NodeActionsContent } from './nodeActionsContent';
import { ResourceTreeProps } from './resourceNode';

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
