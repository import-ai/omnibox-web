import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { SpaceType } from '@/interface';
import { useSidebarStore } from '@/page/sidebar/store';
import {
  fetchChildren,
  fetchSmartFolderChildren,
  searchResources as searchWorkspaceResources,
} from '@/service/resource';
import { rssTreeChildrenParams } from '@/service/resourceSort';

import { ResourcePicker } from './ResourcePicker';
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
}: {
  namespaceId: string;
  onSelect: (resource: ResourcePickerResource) => void;
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
        if (!cancelled) setRoots(workspaceRootsToPickerResources(response, t));
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
  }, [namespaceId, resourceSorts, t]);

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
        resources.map(child => setWorkspacePickerSpace(child, spaceType))
      );
    },
    [namespaceId, resourceSorts]
  );
  const searchResources = useCallback(
    (query: string) => searchWorkspaceResources(namespaceId, query),
    [namespaceId]
  );

  return (
    <ResourcePicker
      enableManagedFolders
      loadFailed={loadFailed}
      loading={loading}
      roots={roots}
      loadChildren={loadChildren}
      searchResources={searchResources}
      onSelect={onSelect}
    />
  );
}
