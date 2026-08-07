import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { SpaceType } from '@/interface';
import { useSidebarStore } from '@/page/sidebar/store';
import {
  fetchChildren,
  fetchSmartFolderChildren,
  searchResources as searchWorkspaceResources,
} from '@/service/resource';

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
  const [roots, setRoots] = useState<ResourcePickerResource[]>([]);
  const resourceSorts = useSidebarStore(state => state.resourceSorts);

  // Subscription (RSS) folders can't be picked as chat context, so we surface
  // them as disabled with an explanatory tooltip instead of a silent no-op.
  const decorateResource = useCallback(
    (resource: ResourcePickerResource): ResourcePickerResource => {
      const rssFolderDisabled = resource.resource_type === 'rss_folder';
      return {
        ...resource,
        children: resource.children?.map(decorateResource),
        disabled: rssFolderDisabled || resource.disabled,
        disabledTooltip: rssFolderDisabled
          ? t('rss_folder.unsupported_operation')
          : resource.disabledTooltip,
      };
    },
    [t]
  );

  useEffect(() => {
    let cancelled = false;
    fetchSortedWorkspaceRootResources(namespaceId, resourceSorts)
      .then(response => {
        if (!cancelled)
          setRoots(
            workspaceRootsToPickerResources(response, t).map(decorateResource)
          );
      })
      .catch(error => {
        if (!cancelled) {
          setRoots([]);
          console.error('Failed to load resource picker roots', error);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [decorateResource, namespaceId, resourceSorts, t]);

  const loadChildren = useCallback(
    (resource: ResourcePickerResource) => {
      const spaceType = resource.picker_space_type ?? 'private';
      return (
        resource.resource_type === 'smart_folder'
          ? fetchSmartFolderChildren(namespaceId, resource.id)
          : fetchChildren(
              namespaceId,
              resource.id,
              getWorkspacePickerSort(resource, resourceSorts)
            )
      ).then(resources =>
        resources.map(child =>
          decorateResource(setWorkspacePickerSpace(child, spaceType))
        )
      );
    },
    [decorateResource, namespaceId, resourceSorts]
  );
  const searchResources = useCallback(
    (query: string) =>
      searchWorkspaceResources(namespaceId, query).then(resources =>
        resources.map(decorateResource)
      ),
    [decorateResource, namespaceId]
  );

  return (
    <ResourcePicker
      roots={roots}
      loadChildren={loadChildren}
      searchResources={searchResources}
      onSelect={onSelect}
    />
  );
}
