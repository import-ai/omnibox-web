import { create } from 'zustand';

import type { ResourceRevisionDetail } from '@/service/resource';

interface ResourceHistoryState {
  selections: Record<string, ResourceRevisionDetail>;
  selectRevision: (
    namespaceId: string,
    resourceId: string,
    revision: ResourceRevisionDetail
  ) => void;
  clearRevision: (namespaceId: string, resourceId: string) => void;
}

export function resourceHistoryKey(namespaceId: string, resourceId: string) {
  return `${namespaceId}:${resourceId}`;
}

export const useResourceHistoryStore = create<ResourceHistoryState>(set => ({
  selections: {},
  selectRevision: (namespaceId, resourceId, revision) =>
    set(state => ({
      selections: {
        ...state.selections,
        [resourceHistoryKey(namespaceId, resourceId)]: revision,
      },
    })),
  clearRevision: (namespaceId, resourceId) =>
    set(state => {
      const selections = { ...state.selections };
      delete selections[resourceHistoryKey(namespaceId, resourceId)];
      return { selections };
    }),
}));
