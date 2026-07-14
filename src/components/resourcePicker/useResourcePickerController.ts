import type { Dispatch, SetStateAction } from 'react';
import { useCallback, useEffect, useState } from 'react';

import {
  expandAllResourceNodes,
  getInitialChildrenLoadTargets,
  getInitialExpandedIds,
} from './resourcePickerState';
import type { ResourcePickerResource } from './resourcePickerTypes';

type ChildrenById = Record<string, ResourcePickerResource[]>;

interface ResourceTreeParams {
  defaultExpandedRootIds: string[];
  expandAllInitially?: boolean;
  initialChildrenById?: Record<string, ResourcePickerResource[]>;
  loadChildren: (
    resource: ResourcePickerResource
  ) => Promise<ResourcePickerResource[]>;
  roots: ResourcePickerResource[];
}

interface ResourceSearchParams {
  searchResources?: (query: string) => Promise<ResourcePickerResource[]>;
}

function collectInitialChildren(
  resources: ResourcePickerResource[],
  childrenById: ChildrenById
) {
  for (const resource of resources) {
    if (resource.children) {
      childrenById[resource.id] = resource.children;
      collectInitialChildren(resource.children, childrenById);
    }
  }
}

function removeLoadingId(
  resourceId: string,
  setLoadingIds: Dispatch<SetStateAction<Set<string>>>
) {
  setLoadingIds(current => {
    const next = new Set(current);
    next.delete(resourceId);
    return next;
  });
}

function useResourceTreeInitialization(
  params: ResourceTreeParams,
  setChildrenById: Dispatch<SetStateAction<ChildrenById>>,
  setExpandedIds: Dispatch<SetStateAction<Set<string>>>,
  setLoadingIds: Dispatch<SetStateAction<Set<string>>>
) {
  useEffect(() => {
    const nextChildren: ChildrenById = {
      ...(params.initialChildrenById ?? {}),
    };
    collectInitialChildren(params.roots, nextChildren);
    let cancelled = false;

    if (params.expandAllInitially) {
      setChildrenById(nextChildren);
      setExpandedIds(new Set());
      setLoadingIds(new Set());

      expandAllResourceNodes(params.roots, params.loadChildren, nextChildren, {
        onNodeLoadStart: resourceId => {
          if (cancelled) return;
          setLoadingIds(current => new Set(current).add(resourceId));
        },
        onNodeLoadEnd: resourceId => {
          if (cancelled) return;
          removeLoadingId(resourceId, setLoadingIds);
        },
        onUpdate: ({ childrenById, expandedIds }) => {
          if (cancelled) return;
          setChildrenById(childrenById);
          setExpandedIds(expandedIds);
        },
      }).catch(error => {
        if (!cancelled) {
          console.error('Failed to expand resource picker tree', error);
        }
      });

      return () => {
        cancelled = true;
      };
    }

    const expandedIds = getInitialExpandedIds(
      params.roots,
      params.defaultExpandedRootIds
    );
    const targets = getInitialChildrenLoadTargets(
      params.roots,
      nextChildren,
      expandedIds
    );

    setChildrenById(nextChildren);
    setExpandedIds(expandedIds);
    setLoadingIds(new Set(targets.map(resource => resource.id)));
    targets.forEach(resource => {
      params
        .loadChildren(resource)
        .then(children => {
          if (!cancelled) {
            setChildrenById(current => ({
              ...current,
              [resource.id]: children,
            }));
          }
        })
        .catch(error => {
          if (!cancelled) {
            console.error('Failed to load resource picker children', error);
          }
        })
        .finally(() => {
          if (!cancelled) removeLoadingId(resource.id, setLoadingIds);
        });
    });
    return () => {
      cancelled = true;
    };
  }, [
    params.defaultExpandedRootIds,
    params.expandAllInitially,
    params.initialChildrenById,
    params.loadChildren,
    params.roots,
    setChildrenById,
    setExpandedIds,
    setLoadingIds,
  ]);
}

function useResourceTreeState(params: ResourceTreeParams) {
  const [childrenById, setChildrenById] = useState<ChildrenById>({});
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());
  useResourceTreeInitialization(
    params,
    setChildrenById,
    setExpandedIds,
    setLoadingIds
  );

  const toggleExpand = useCallback(
    async (resource: ResourcePickerResource) => {
      if (expandedIds.has(resource.id)) {
        setExpandedIds(current => {
          const next = new Set(current);
          next.delete(resource.id);
          return next;
        });
        return;
      }
      if (!childrenById[resource.id]) {
        setLoadingIds(current => new Set(current).add(resource.id));
        try {
          const children = await params.loadChildren(resource);
          setChildrenById(current => ({
            ...current,
            [resource.id]: children,
          }));
        } catch (error) {
          console.error('Failed to load resource picker children', error);
          return;
        } finally {
          removeLoadingId(resource.id, setLoadingIds);
        }
      }
      setExpandedIds(current => new Set(current).add(resource.id));
    },
    [childrenById, expandedIds, params]
  );

  return { childrenById, expandedIds, loadingIds, toggleExpand };
}

function useResourceSearch({ searchResources }: ResourceSearchParams) {
  const [search, setSearch] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchFailed, setSearchFailed] = useState(false);
  const [searchResults, setSearchResults] = useState<ResourcePickerResource[]>(
    []
  );

  useEffect(() => {
    if (!searchResources || !search) {
      setSearchResults([]);
      setSearchLoading(false);
      setSearchFailed(false);
      return;
    }
    let cancelled = false;
    setSearchLoading(true);
    setSearchFailed(false);
    searchResources(search)
      .then(resources => {
        if (!cancelled) setSearchResults(resources);
      })
      .catch(error => {
        if (!cancelled) {
          setSearchResults([]);
          setSearchFailed(true);
          console.error('Failed to search resource picker resources', error);
        }
      })
      .finally(() => {
        if (!cancelled) setSearchLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [search, searchResources]);

  return {
    search,
    searchFailed,
    searchLoading,
    searchResults,
    setSearch,
  };
}

/** Owns asynchronous tree and search state for the resource picker. */
export function useResourcePickerController(
  treeParams: ResourceTreeParams,
  searchParams: ResourceSearchParams
) {
  return {
    ...useResourceTreeState(treeParams),
    ...useResourceSearch(searchParams),
  };
}
