import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { useShallow } from 'zustand/react/shallow';

import type { SpaceType } from '@/interface';

import { buildActions } from './actions';
import type { SidebarStore, TreeNode } from './types';
import { initialState } from './types';
import {
  calculateSelectedCount,
  isNodeDimmedBySelection,
  isNodeFullySelected,
  isNodeIndeterminate,
} from './utils';

export type {
  DialogsState,
  NodeUI,
  RemoveResult,
  RootResource,
  SidebarActions,
  SidebarGet,
  SidebarSet,
  SidebarState,
  SidebarStore,
  TreeNode,
} from './types';
export {
  calculateSelectedCount,
  collectParentIds,
  createNode,
  detectSpaceType,
  findNextActiveId,
  getDescendantIds,
  isDescendant,
  isNodeDimmedBySelection,
  isNodeFullySelected,
  isNodeIndeterminate,
  patchNodeFromResource,
  traverseDescendants,
} from './utils';
export type { CreatePayload } from '@/service/resource';
export {
  batchDeleteResources,
  batchMoveResources,
  createResource,
  deleteResource,
  fetchChildren,
  fetchResource,
  fetchResourcesByIds,
  moveResource,
  renameResource,
  restoreResource,
  uploadResource,
} from '@/service/resource';

export const useSidebarStore = create<SidebarStore>()(
  immer((set, get) => ({
    ...initialState,
    ...buildActions(set, get),
  }))
);

// ─── Selectors ───

export function useNode(id: string): TreeNode | undefined {
  return useSidebarStore(state => state.nodes[id]);
}

export function useActiveId(): string | null {
  return useSidebarStore(state => state.activeId);
}

export function useIsActive(id: string): boolean {
  return useSidebarStore(state => state.activeId === id);
}

export function useIsSpaceExpanded(spaceType: SpaceType): boolean {
  return useSidebarStore(state => state.spaceExpanded[spaceType] !== false);
}

export function useRootId(spaceType: SpaceType): string {
  return useSidebarStore(state => state.rootIds[spaceType]);
}

export function useNodesSize(): number {
  return useSidebarStore(state => Object.keys(state.nodes).length);
}

export function useUpload(id: string): string | undefined {
  return useSidebarStore(state => state.dialogs.upload[id]);
}

export function useSelectedCount(): number {
  return useSidebarStore(state =>
    calculateSelectedCount(state.nodes, state.selectedIds)
  );
}

export function useIsSelected(id: string): boolean {
  return useSidebarStore(state => Boolean(state.selectedIds[id]));
}

export function useSelectionState() {
  return useSidebarStore(
    useShallow(state => ({
      selectedIds: state.selectedIds,
      selectionMode: state.selectionMode,
      lastSelectedId: state.lastSelectedId,
      failedIds: state.failedIds,
    }))
  );
}

export function useSelectionMode(): boolean {
  return useSidebarStore(state => state.selectionMode);
}

export function useIsFailed(id: string): boolean {
  return useSidebarStore(state => Boolean(state.failedIds[id]));
}

export function useNodeIsIndeterminate(id: string): boolean {
  return useSidebarStore(state =>
    isNodeIndeterminate(state.nodes, state.selectedIds, id)
  );
}

export function useNodeIsFullySelected(id: string): boolean {
  return useSidebarStore(state =>
    isNodeFullySelected(state.nodes, state.selectedIds, id)
  );
}

export function useNodeIsDimmedBySelection(id: string): boolean {
  return useSidebarStore(state =>
    isNodeDimmedBySelection(state.nodes, state.selectedIds, id)
  );
}
