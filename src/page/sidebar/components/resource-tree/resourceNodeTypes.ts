import type { Namespace } from '@/interface';
import type { TreeNode } from '@/page/sidebar/store';

interface ResourceNodeActions {
  currentNamespace?: Namespace;
  hasTeamspace: boolean;
  onAddToChat: () => void;
  onBatchCreate: () => void;
  onBatchDelete: () => void;
  onBatchMove: () => void;
}

export interface ResourceNodeProps extends ResourceNodeActions {
  depth?: number;
  nodeId: string;
}

export interface ResourceNodeContentProps extends ResourceNodeActions {
  depth: number;
  node: TreeNode;
  nodeId: string;
}
