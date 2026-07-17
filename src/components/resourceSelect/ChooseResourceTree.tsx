import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  ResourcePicker,
  type ResourcePickerResource,
} from '@/components/resourcePicker';
import { DropdownMenuSeparator } from '@/components/ui/DropdownMenu';
import {
  fetchChildren,
  fetchRootResources,
  fetchSmartFolderChildren,
  searchResources,
} from '@/service/resource';

interface ChooseResourceTreeProps {
  namespaceId: string;
  resourceId: string;
  disabledIds?: string[];
  disabledTooltip?: string;
  onChange: (resource: ResourcePickerResource) => void;
}

/** Destination tree for ResourceSelect — same picker UX as Move to, pick closes the menu. */
export function ChooseResourceTree({
  namespaceId,
  resourceId,
  disabledIds,
  disabledTooltip,
  onChange,
}: ChooseResourceTreeProps) {
  const { t } = useTranslation();
  const [roots, setRoots] = useState<ResourcePickerResource[]>([]);
  const disabledResourceIds = useMemo(
    () => new Set(disabledIds ?? []),
    [disabledIds]
  );

  const decorateResource = useCallback(
    (
      resource: ResourcePickerResource,
      parentDisabled = false
    ): ResourcePickerResource | null => {
      const operatingResource =
        parentDisabled || disabledResourceIds.has(resource.id);
      const children = resource.children
        ?.map(child => decorateResource(child, operatingResource))
        .filter(Boolean) as ResourcePickerResource[] | undefined;

      return {
        ...resource,
        children,
        disabled: operatingResource,
        disabledTooltip: operatingResource ? disabledTooltip : undefined,
      };
    },
    [disabledResourceIds, disabledTooltip]
  );

  useEffect(() => {
    let cancelled = false;
    fetchRootResources(namespaceId)
      .then(response => {
        if (cancelled) return;
        setRoots(
          Object.keys(response).flatMap(spaceType => {
            const root = response[spaceType];
            if (!root.id) return [];
            const decorated = decorateResource({
              ...root,
              name: t(spaceType),
              children: root.children ?? [],
            });
            return decorated ? [decorated] : [];
          })
        );
      })
      .catch(error => {
        if (!cancelled) {
          setRoots([]);
          console.error('Failed to load resource select roots', error);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [decorateResource, namespaceId, t]);

  const defaultExpandedRootIds = useMemo(
    () => roots.map(root => root.id),
    [roots]
  );

  const loadChildren = useCallback(
    (resource: ResourcePickerResource) =>
      (resource.resource_type === 'smart_folder'
        ? fetchSmartFolderChildren(namespaceId, resource.id)
        : fetchChildren(namespaceId, resource.id)
      ).then(
        resources =>
          resources
            .map(child => decorateResource(child, Boolean(resource.disabled)))
            .filter(Boolean) as ResourcePickerResource[]
      ),
    [decorateResource, namespaceId]
  );

  const search = useCallback(
    (query: string) =>
      searchResources(namespaceId, query).then(
        resources =>
          resources
            .map(resource => decorateResource(resource))
            .filter(Boolean) as ResourcePickerResource[]
      ),
    [decorateResource, namespaceId]
  );

  return (
    <ResourcePicker
      roots={roots}
      defaultExpandedRootIds={defaultExpandedRootIds}
      loadChildren={loadChildren}
      searchResources={search}
      searchPlaceholder={t('search.title')}
      searchContainerClassName="mb-0 min-h-0 rounded-none border-0"
      searchInputClassName="border-none focus-visible:ring-0"
      searchOnKeyDown={event => {
        event.stopPropagation();
      }}
      beforeList={<DropdownMenuSeparator />}
      listClassName="no-scrollbar min-h-0 max-h-72 pb-0"
      selectedResourceId={resourceId}
      onSelect={onChange}
    />
  );
}
