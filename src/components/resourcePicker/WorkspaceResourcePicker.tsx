import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { SpaceType } from '@/interface';
import {
  fetchChildren,
  fetchRootResources,
  fetchSmartFolderChildren,
  searchResources as searchWorkspaceResources,
} from '@/service/resource';

import { ResourcePicker } from './ResourcePicker';
import type { ResourcePickerResource } from './resourcePickerTypes';

function workspaceRootsToPickerResources(
  response: Awaited<ReturnType<typeof fetchRootResources>>,
  t: (key: string) => string
) {
  return Object.keys(response).flatMap(spaceType => {
    const root = response[spaceType];
    if (!root.id) return [];
    return [
      {
        ...root,
        name: t(spaceType as SpaceType),
        children: root.children ?? [],
      },
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

  useEffect(() => {
    let cancelled = false;
    fetchRootResources(namespaceId)
      .then(response => {
        if (!cancelled) setRoots(workspaceRootsToPickerResources(response, t));
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
  }, [namespaceId, t]);

  const loadChildren = useCallback(
    (resource: ResourcePickerResource) =>
      resource.resource_type === 'smart_folder'
        ? fetchSmartFolderChildren(namespaceId, resource.id)
        : fetchChildren(namespaceId, resource.id),
    [namespaceId]
  );
  const searchResources = useCallback(
    (query: string) => searchWorkspaceResources(namespaceId, query),
    [namespaceId]
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
