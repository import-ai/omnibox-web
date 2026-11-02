import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { PathItem, SpaceType } from '@/interface';
import { useSidebarStore } from '@/page/sidebar/store';
import {
  fetchChildren,
  fetchSmartFolderChildren,
  searchResources as searchWorkspaceResources,
} from '@/service/resource';
import { rssTreeChildrenParams } from '@/service/resourceSort';

import { withLinkDestinationAvailability } from './linkDestination';
import { ResourcePicker } from './ResourcePicker';
import { getInitialRootExpansionIds } from './resourcePickerState';
import type { ResourcePickerResource } from './resourcePickerTypes';
import {
  fetchSortedWorkspaceRootResources,
  getWorkspacePickerSort,
  setWorkspacePickerSpace,
} from './workspaceResourcePickerSort';

function workspaceRootsToPickerResources(
  response: Awaited<ReturnType<typeof fetchSortedWorkspaceRootResources>>,
  t: (key: string) => string
) {
  return (Object.keys(response) as SpaceType[]).flatMap(spaceType => {
    const root = response[spaceType];
    if (!root.id) return [];
    return [
      setWorkspacePickerSpace(
        {
          ...root,
          name: t(spaceType),
          children: root.children ?? [],
        },
        spaceType
      ),
    ];
  });
}

export function WorkspaceResourcePicker({
  namespaceId,
  onSelect,
  linkDestination = false,
  selectedResourceId,
  selectedResourcePath,
}: {
  namespaceId: string;
  onSelect: (resource: ResourcePickerResource) => void;
  /** Grey out folders that cannot store a newly saved link. */
  linkDestination?: boolean;
  selectedResourceId?: string;
  selectedResourcePath?: PathItem[];
}) {
  const { t } = useTranslation();
  const [loadFailed, setLoadFailed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [roots, setRoots] = useState<ResourcePickerResource[]>([]);
  const resourceSorts = useSidebarStore(state => state.resourceSorts);

  // Every container is pickable as chat context, rss folders included: an rss
  // folder attaches its articles the same way a plain folder attaches its docs.
  useEffect(() => {
    let cancelled = false;
    setLoadFailed(false);
    setLoading(true);
    fetchSortedWorkspaceRootResources(namespaceId, resourceSorts)
      .then(response => {
        if (cancelled) return;
        const roots = workspaceRootsToPickerResources(response, t);
        setRoots(
          linkDestination
            ? roots.map(root => withLinkDestinationAvailability(root, t))
            : roots
        );
      })
      .catch(error => {
        if (!cancelled) {
          setRoots([]);
          setLoadFailed(true);
          console.error('Failed to load resource picker roots', error);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [linkDestination, namespaceId, resourceSorts, t]);

  const present = useCallback(
    (resource: ResourcePickerResource) =>
      linkDestination ? withLinkDestinationAvailability(resource, t) : resource,
    [linkDestination, t]
  );
  const loadChildren = useCallback(
    (resource: ResourcePickerResource) => {
      const spaceType = resource.picker_space_type ?? 'private';
      return (
        resource.resource_type === 'smart_folder'
          ? fetchSmartFolderChildren(namespaceId, resource.id)
          : fetchChildren(
              namespaceId,
              resource.id,
              getWorkspacePickerSort(resource, resourceSorts),
              { params: rssTreeChildrenParams(resource.resource_type) }
            )
      ).then(resources =>
        resources.map(child =>
          present(setWorkspacePickerSpace(child, spaceType))
        )
      );
    },
    [namespaceId, present, resourceSorts]
  );
  const searchResources = useCallback(
    (query: string) =>
      searchWorkspaceResources(namespaceId, query).then(resources =>
        resources.map(present)
      ),
    [namespaceId, present]
  );

  const defaultExpandedRootIds = useMemo(
    () =>
      selectedResourceId
        ? getInitialRootExpansionIds(
            roots,
            selectedResourceId,
            selectedResourcePath
          )
        : undefined,
    [roots, selectedResourceId, selectedResourcePath]
  );
  const defaultExpandedIds = useMemo(
    () =>
      selectedResourceId
        ? (selectedResourcePath ?? [])
            .map(item => item.id)
            .filter(id => id !== selectedResourceId)
        : undefined,
    [selectedResourceId, selectedResourcePath]
  );

  return (
    <ResourcePicker
      enableManagedFolders
      loadFailed={loadFailed}
      loading={loading}
      roots={roots}
      loadChildren={loadChildren}
      searchResources={searchResources}
      selectedResourceId={selectedResourceId}
      defaultExpandedIds={defaultExpandedIds}
      defaultExpandedRootIds={defaultExpandedRootIds}
      onSelect={onSelect}
    />
  );
}
