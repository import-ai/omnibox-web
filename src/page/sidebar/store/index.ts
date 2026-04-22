import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

import { SpaceType } from '@/interface';

import { buildActions } from './actions';
import type { SidebarStore, TreeNode } from './types';
import { initialState } from './types';

export type {
  BatchCreateItem,
  BatchMoveItem,
  BatchRenameItem,
  CreatePayload,
} from './api';
export { sidebarApi } from './api';
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

export function useIsUploading(id: string): boolean {
  return useSidebarStore(state => id in state.uploading);
}

export function useUploadProgress(id: string): string | undefined {
  return useSidebarStore(state => state.uploadProgress[id]);
}
