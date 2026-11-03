import { create } from 'zustand';

import type {
  ResourceRevisionDetail,
  ResourceRevisionSummary,
} from '@/service/resource';

export function supportsResourceHistory(resourceType?: string) {
  return ['doc', 'file', 'link'].includes(resourceType ?? '');
}

interface ResourceHistoryState {
  selections: Record<string, ResourceRevisionDetail>;
  selectRevision: (
    namespaceId: string,
    resourceId: string,
    revision: ResourceRevisionDetail
  ) => void;
  syncRevisionAuthors: (
    namespaceId: string,
    resourceId: string,
    revisions: ResourceRevisionSummary[]
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
  syncRevisionAuthors: (namespaceId, resourceId, revisions) =>
    set(state => {
      const key = resourceHistoryKey(namespaceId, resourceId);
      const selected = state.selections[key];
      if (!selected) return state;
      const refreshed = revisions.find(revision => revision.id === selected.id);
      if (!refreshed) return state;
      const currentAuthor = selected.author;
      const nextAuthor = refreshed.author;
      if (
        currentAuthor?.id === nextAuthor?.id &&
        currentAuthor?.username === nextAuthor?.username &&
        currentAuthor?.display_name === nextAuthor?.display_name
      ) {
        return state;
      }
      return {
        selections: {
          ...state.selections,
          [key]: { ...selected, author: nextAuthor },
        },
      };
    }),
  clearRevision: (namespaceId, resourceId) =>
    set(state => {
      const selections = { ...state.selections };
      delete selections[resourceHistoryKey(namespaceId, resourceId)];
      return { selections };
    }),
}));
