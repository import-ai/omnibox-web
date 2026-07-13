import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  ResourcePicker,
  type ResourcePickerResource,
} from '@/components/resourcePicker';
import type { Resource, ResourceMeta } from '@/interface';
import type { ResourceType } from '@/interface';
import {
  fetchChildren,
  fetchRootResources,
  fetchSmartFolderChildren,
  searchResources,
} from '@/service/resource';

import { shouldDisableMoveTarget } from './utils';

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

      const mixedSmartFolder = shouldDisableMoveTarget(
        sourceResourceType,
        resource.resource_type
      );
      const disabled = operatingResource || mixedSmartFolder;
      const children = resource.children
        ?.map(child => decorateResource(child, operatingResource))
        .filter(Boolean) as ResourcePickerResource[] | undefined;

      return {
        ...resource,
        children,
        disabled,
        disabledTooltip: mixedSmartFolder
          ? t('smart_folder.move.unsupported_mixed_target')
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
    fetchRootResources(namespaceId).then(response => {
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
    });
    return () => {
      cancelled = true;
    };
  }, [decorateResource, namespaceId, t]);

  const loadChildren = useCallback(
    (resource: ResourcePickerResource) =>
      (resource.resource_type === 'smart_folder'
        ? fetchSmartFolderChildren(namespaceId, resource.id)
        : fetchChildren(namespaceId, resource.id)
      ).then(
        resources =>
          resources
            .map((child: ResourcePickerResource) =>
              decorateResource(child, Boolean(resource.disabled))
            )
            .filter(Boolean) as ResourcePickerResource[]
      ),
    [decorateResource, namespaceId]
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
