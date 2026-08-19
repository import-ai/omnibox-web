import { fetchChildren } from '@/service/resource';

import type { SidebarGet } from './types';
import { getNodeChildrenParams, getNodeResourceSort } from './utils';

export async function refreshSortedChildren(
  get: SidebarGet,
  parentId: string
): Promise<void> {
  try {
    const state = get();
    const children = await fetchChildren(
      state.namespaceId,
      parentId,
      getNodeResourceSort(state, parentId),
      { mute: true, params: getNodeChildrenParams(state, parentId) }
    );
    get().refreshChildren(parentId, children);
  } catch {
    // Keep the successful optimistic update when the follow-up refresh fails.
  }
}
