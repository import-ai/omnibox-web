import { useCallback, useMemo, useState } from 'react';

import type { ResourceMeta } from '@/interface';
import { useSidebarStore } from '@/page/share/sidebar/store';
import { fetchShareChildren } from '@/service/share';

import { ResourcePicker } from './ResourcePicker';
import type { ResourcePickerResource } from './resourcePickerTypes';
import {
  buildShareResourcePickerChildrenById,
  getShareSidebarLoadedChildren,
} from './shareResourcePickerCache';

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
  // Snapshot sidebar cache when the picker mounts (typically after sidebar expand-all).
  const [initialChildrenById] = useState(() =>
    canBrowseResources
      ? buildShareResourcePickerChildrenById(
          useSidebarStore.getState(),
          shareId
        )
      : {}
  );
  const loadChildren = useCallback(
    async (resource: ResourcePickerResource) => {
      if (!canBrowseResources) return [];

      const cached = getShareSidebarLoadedChildren(
        useSidebarStore.getState(),
        shareId,
        resource.id
      );
      if (cached) return cached;

      return fetchShareChildren(shareId, resource.id);
    },
    [canBrowseResources, shareId]
  );

  return (
    <ResourcePicker
      expandAllInitially={canBrowseResources}
      initialChildrenById={initialChildrenById}
      roots={roots}
      loadChildren={loadChildren}
      onSelect={onSelect}
    />
  );
}
