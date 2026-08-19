import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  ResourcePicker,
  type ResourcePickerResource,
} from '@/components/resourcePicker';
import {
  fetchSortedWorkspaceRootResources,
  getWorkspacePickerSort,
  setWorkspacePickerSpace,
} from '@/components/resourcePicker/workspaceResourcePickerSort';
import type {
  Resource,
  ResourceMeta,
  ResourceType,
  SpaceType,
} from '@/interface';
import { useSidebarStore } from '@/page/sidebar/store';
import {
  fetchChildren,
  fetchSmartFolderChildren,
  searchResources,
} from '@/service/resource';
import { rssTreeChildrenParams } from '@/service/resourceSort';

import { isManagedChildrenFolder, shouldDisableMoveTarget } from './utils';

export interface IFormProps {
  resourceIds: string[];
  namespaceId: string;
  showDisabledTargets?: boolean;
  disabledTargetIds?: string[];
  disabledTargetTooltip?: string;
  sourceResourceType?: ResourceType;
  onFinished?: (
    resourceIds: string[],
    targetId: string,
    targetName?: string,
    targetResource?: Resource | ResourceMeta
  ) => void;
}

export default function MoveToForm(props: IFormProps) {
  const {
    resourceIds,
    namespaceId,
    showDisabledTargets,
    disabledTargetIds,
    disabledTargetTooltip,
    sourceResourceType,
    onFinished,
  } = props;
  const { t } = useTranslation();
  const [roots, setRoots] = useState<ResourcePickerResource[]>([]);
  const resourceSorts = useSidebarStore(state => state.resourceSorts);
  const disabledResourceIds = useMemo(
    () => new Set(disabledTargetIds ?? resourceIds),
    [disabledTargetIds, resourceIds]
  );
  const decorateResource = useCallback(
    (
      resource: ResourcePickerResource,
      parentDisabled = false
    ): ResourcePickerResource | null => {
      const operatingResource =
        parentDisabled || disabledResourceIds.has(resource.id);
      if (operatingResource && !showDisabledTargets) return null;

      const unsupportedTarget =
        shouldDisableMoveTarget(sourceResourceType, resource.resource_type) ||
        // Backend-managed resources (rss items) hold no user resources.
        resource.read_only === true;
      const disabled = operatingResource || unsupportedTarget;
      const children = resource.children
        ?.map(child => decorateResource(child, operatingResource))
        .filter(Boolean) as ResourcePickerResource[] | undefined;

      return {
        ...resource,
        children,
        disabled,
        disabledTooltip: unsupportedTarget
          ? isManagedChildrenFolder(resource.resource_type)
            ? t('rss_folder.move.unsupported_target')
            : resource.read_only
              ? t('resource.read_only_target')
              : t('smart_folder.move.unsupported_mixed_target')
          : operatingResource
            ? disabledTargetTooltip
            : undefined,
      };
    },
    [
      disabledResourceIds,
      disabledTargetTooltip,
      showDisabledTargets,
      sourceResourceType,
      t,
    ]
  );

  useEffect(() => {
    let cancelled = false;
    fetchSortedWorkspaceRootResources(namespaceId, resourceSorts).then(
      response => {
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
      }
    );
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
              getWorkspacePickerSort(resource, resourceSorts),
              { params: rssTreeChildrenParams(resource.resource_type) }
            )
      ).then(
        resources =>
          resources
            .map((child: ResourcePickerResource) =>
              decorateResource(
                setWorkspacePickerSpace(child, spaceType),
                Boolean(resource.disabled)
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
            .map((resource: ResourcePickerResource) =>
              decorateResource(resource)
            )
            .filter(Boolean) as ResourcePickerResource[]
      ),
    [decorateResource, namespaceId]
  );

  return (
    <ResourcePicker
      roots={roots}
      loadChildren={loadChildren}
      searchResources={search}
      onSelect={resource =>
        onFinished?.(
          resourceIds,
          resource.id,
          resource.name || t('untitled'),
          resource as Resource | ResourceMeta
        )
      }
    />
  );
}
