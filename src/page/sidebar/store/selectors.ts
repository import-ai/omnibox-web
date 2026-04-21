import { SpaceType } from '@/interface';

import { useSidebarStore } from './sidebar-store';
import { TreeNode } from './types';

export function useNode(id: string): TreeNode | undefined {
  return useSidebarStore(state => state.nodes[id]);
}

export function useActiveId(): string | null {
  return useSidebarStore(state => state.activeId);
}

export function useIsActive(id: string): boolean {
  return useSidebarStore(state => state.activeId === id);
}

export function useEditingId(): string | null {
  return useSidebarStore(state => state.editingId);
}

export function useIsEditing(id: string): boolean {
  return useSidebarStore(state => state.editingId === id);
}

export function useIsSpaceExpanded(spaceType: SpaceType): boolean {
  return useSidebarStore(state => state.spaceExpanded[spaceType] !== false);
}

export function useRootId(spaceType: SpaceType): string {
  return useSidebarStore(state => state.rootIds[spaceType]);
}

export function useNodesSize(): number {
  return useSidebarStore(state => {
    let count = 0;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    for (const _ in state.nodes) count++;
    return count;
  });
}

export function useIsUploading(id: string): boolean {
  return useSidebarStore(state => id in state.uploading);
}

export function useUploadProgress(id: string): string | undefined {
  return useSidebarStore(state => state.uploadProgress[id]);
}
