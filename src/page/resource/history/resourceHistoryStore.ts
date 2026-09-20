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

function resourceHistoryKey(namespaceId: string, resourceId: string) {
  return `${namespaceId}:${resourceId}`;
}

export function setResourceRevisionQuery(value: string | null) {
  const next = new URL(window.location.href);
  if (value) next.searchParams.set('revision', value);
  else next.searchParams.delete('revision');
  window.history.replaceState(window.history.state, '', next);
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
