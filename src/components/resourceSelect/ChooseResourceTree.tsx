import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  ResourcePicker,
  type ResourcePickerResource,
} from '@/components/resourcePicker';
import { getInitialRootExpansionIds } from '@/components/resourcePicker/resourcePickerState';
import {
  fetchSortedWorkspaceRootResources,
  getWorkspacePickerSort,
  setWorkspacePickerSpace,
} from '@/components/resourcePicker/workspaceResourcePickerSort';
import { DropdownMenuSeparator } from '@/components/ui/DropdownMenu';
import type { PathItem, SpaceType } from '@/interface';
import { useSidebarStore } from '@/page/sidebar/store';
import {
  fetchChildren,
  fetchSmartFolderChildren,
  searchResources,
} from '@/service/resource';

interface ChooseResourceTreeProps {
  namespaceId: string;
  resourceId: string;
  selectedResourcePath?: PathItem[];
  disabledIds?: string[];
  disabledTooltip?: string;
  disableSmartFolders?: boolean;
  smartFolderDisabledTooltip?: string;
  onChange: (resource: ResourcePickerResource) => void;
}

type ChooseResourceTreeResource = ResourcePickerResource & {
  descendantsDisabled?: boolean;
};

/** Destination tree for ResourceSelect — same picker UX as Move to, pick closes the menu. */
export function ChooseResourceTree({
  namespaceId,
  resourceId,
  selectedResourcePath,
  disabledIds,
  disabledTooltip,
  disableSmartFolders,
  smartFolderDisabledTooltip,
  onChange,
}: ChooseResourceTreeProps) {
  const { t } = useTranslation();
  const [roots, setRoots] = useState<ChooseResourceTreeResource[]>([]);
  const resourceSorts = useSidebarStore(state => state.resourceSorts);
  const disabledResourceIds = useMemo(
    () => new Set(disabledIds ?? []),
    [disabledIds]
  );

  const decorateResource = useCallback(
    (
      resource: ResourcePickerResource,
      parentDisabled = false
    ): ChooseResourceTreeResource | null => {
      const operatingResource =
        parentDisabled || disabledResourceIds.has(resource.id);
      const smartFolderDisabled =
        disableSmartFolders && resource.resource_type === 'smart_folder';
      const rssFolderDisabled =
        disableSmartFolders && resource.resource_type === 'rss_folder';
      // Backend-managed resources (rss items) can't contain other resources.
      const readOnlyDisabled = resource.read_only === true;
      const children = resource.children
        ?.map(child => decorateResource(child, operatingResource))
        .filter(Boolean) as ResourcePickerResource[] | undefined;

      return {
        ...resource,
        children,
        disabled:
          operatingResource ||
          smartFolderDisabled ||
          rssFolderDisabled ||
          readOnlyDisabled,
        descendantsDisabled: operatingResource,
        disabledTooltip: rssFolderDisabled
          ? t('rss_folder.cannot_be_parent')
          : readOnlyDisabled
            ? t('resource.read_only_target')
            : smartFolderDisabled
              ? smartFolderDisabledTooltip
              : operatingResource
                ? disabledTooltip
                : undefined,
      };
    },
    [
      disabledResourceIds,
      disabledTooltip,
      disableSmartFolders,
      smartFolderDisabledTooltip,
      t,
    ]
  );

  useEffect(() => {
    let cancelled = false;
    fetchSortedWorkspaceRootResources(namespaceId, resourceSorts)
      .then(response => {
        if (cancelled) return;
        setRoots(
          (Object.keys(response) as SpaceType[]).flatMap(spaceType => {
            const root = response[spaceType];
            if (!root.id) return [];
            const decorated = decorateResource(
              setWorkspacePickerSpace(
                {
                  ...root,
                  name: t(spaceType),
                  children: root.children ?? [],
                },
                spaceType
              )
            );
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
  }, [decorateResource, namespaceId, resourceSorts, t]);

  const defaultExpandedRootIds = useMemo(
    () => getInitialRootExpansionIds(roots, resourceId, selectedResourcePath),
    [resourceId, roots, selectedResourcePath]
  );
  const defaultExpandedIds = useMemo(
    () =>
      (selectedResourcePath ?? [])
        .map(item => item.id)
        .filter(id => id !== resourceId),
    [resourceId, selectedResourcePath]
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
              getWorkspacePickerSort(resource, resourceSorts)
            )
      ).then(
        resources =>
          resources
            .map(child =>
              decorateResource(
                setWorkspacePickerSpace(child, spaceType),
                Boolean(
                  (resource as ChooseResourceTreeResource).descendantsDisabled
                )
              )
            )
            .filter(Boolean) as ResourcePickerResource[]
      );
    },
    [decorateResource, namespaceId, resourceSorts]
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
      defaultExpandedIds={defaultExpandedIds}
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
      listClassName="min-h-0 max-h-72 pb-0 pr-1 [scrollbar-gutter:stable] [scrollbar-width:thin] [scrollbar-color:hsl(var(--border))_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-track]:bg-transparent"
      selectedResourceId={resourceId}
      onSelect={onChange}
    />
  );
}
