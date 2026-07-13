import { useCallback, useMemo } from 'react';

import type { ResourceMeta } from '@/interface';
import { fetchShareChildren } from '@/service/share';

import { ResourcePicker } from './ResourcePicker';
import type { ResourcePickerResource } from './resourcePickerTypes';

export function ShareResourcePicker({
  shareId,
  rootResource,
  canBrowseResources,
  onSelect,
}: {
  shareId: string;
  rootResource: ResourceMeta;
  canBrowseResources: boolean;
  onSelect: (resource: ResourcePickerResource) => void;
}) {
  const roots = useMemo(
    () => [
      {
        ...rootResource,
        has_children: canBrowseResources ? rootResource.has_children : false,
      },
    ],
    [canBrowseResources, rootResource]
  );
  const loadChildren = useCallback(
    (resource: ResourcePickerResource) =>
      canBrowseResources
        ? fetchShareChildren(shareId, resource.id)
        : Promise.resolve([]),
    [canBrowseResources, shareId]
  );

  return (
    <ResourcePicker
      expandAllInitially={canBrowseResources}
      roots={roots}
      loadChildren={loadChildren}
      onSelect={onSelect}
    />
  );
}
