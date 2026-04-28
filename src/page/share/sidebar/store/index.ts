import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

import { buildActions } from './actions';
import type { SidebarStore, SpaceType, TreeNode } from './types';
import { initialState } from './types';

export type {
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
  collectParentIds,
  createNode,
  detectSpaceType,
  findNextActiveId,
  getDescendantIds,
  isDescendant,
  patchNodeFromResource,
  traverseDescendants,
} from './utils';
export type { CreatePayload } from '@/service/resource';
export {
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
