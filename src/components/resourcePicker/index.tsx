import { ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Arrow } from '@/assets/icons/Arrow';
import ResourceIcon from '@/assets/icons/ResourceIcon';
import { SearchField } from '@/components/search/SearchField';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/tooltip';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import type { ResourceMeta, SpaceType } from '@/interface';
import { cn } from '@/lib/utils';
import {
  fetchChildren,
  fetchRootResources,
  fetchSmartFolderChildren,
  searchResources as searchWorkspaceResources,
} from '@/service/resource';
import { fetchShareChildren } from '@/service/share';

import {
  getInitialChildrenLoadTargets,
  getInitialExpandedIds,
  shouldAutoExpandSharedRoot,
} from './resourcePickerState';

const emptyDefaultExpandedRootIds: string[] = [];

export type ResourcePickerResource = ResourceMeta & {
  children?: ResourcePickerResource[];
  disabled?: boolean;
  disabledTooltip?: ReactNode;
};

interface ResourcePickerProps {
  defaultExpandedRootIds?: string[];
  roots: ResourcePickerResource[];
  loadChildren: (
    resource: ResourcePickerResource
  ) => Promise<ResourcePickerResource[]>;
  searchResources?: (query: string) => Promise<ResourcePickerResource[]>;
  onSelect: (resource: ResourcePickerResource) => void;
}

function collectInitialChildren(
  resources: ResourcePickerResource[],
  childrenById: Record<string, ResourcePickerResource[]>
) {
  for (const resource of resources) {
    if (resource.children) {
      childrenById[resource.id] = resource.children;
      collectInitialChildren(resource.children, childrenById);
    }
  }
}

export function ResourcePicker({
  defaultExpandedRootIds = emptyDefaultExpandedRootIds,
  roots,
  loadChildren,
  searchResources,
  onSelect,
}: ResourcePickerProps) {
  const { t } = useTranslation();
  const [childrenById, setChildrenById] = useState<
    Record<string, ResourcePickerResource[]>
  >({});
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<ResourcePickerResource[]>(
    []
  );

  useEffect(() => {
    const nextChildren: Record<string, ResourcePickerResource[]> = {};
    collectInitialChildren(roots, nextChildren);
    let cancelled = false;
    const initialExpandedIds = getInitialExpandedIds(
      roots,
      defaultExpandedRootIds
    );
    const loadTargets = getInitialChildrenLoadTargets(
      roots,
      nextChildren,
      initialExpandedIds
    );

    setChildrenById(nextChildren);
    setExpandedIds(initialExpandedIds);
    setLoadingIds(new Set(loadTargets.map(resource => resource.id)));
    loadTargets.forEach(resource => {
      loadChildren(resource)
        .then(children => {
          if (!cancelled) {
            setChildrenById(current => ({
              ...current,
              [resource.id]: children,
            }));
          }
        })
        .catch(error => {
          if (!cancelled) {
            console.error('Failed to load resource picker children', error);
          }
        })
        .finally(() => {
          if (cancelled) return;
          setLoadingIds(current => {
            const next = new Set(current);
            next.delete(resource.id);
            return next;
          });
        });
    });

    return () => {
      cancelled = true;
    };
  }, [defaultExpandedRootIds, loadChildren, roots]);

  useEffect(() => {
    if (!searchResources || !search) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }

    let cancelled = false;
    setSearchLoading(true);
    searchResources(search)
      .then(resources => {
        if (!cancelled) setSearchResults(resources);
      })
      .finally(() => {
        if (!cancelled) setSearchLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [search, searchResources]);

  const toggleExpand = async (resource: ResourcePickerResource) => {
    if (expandedIds.has(resource.id)) {
      setExpandedIds(current => {
        const next = new Set(current);
        next.delete(resource.id);
        return next;
      });
      return;
    }

    if (!childrenById[resource.id]) {
      setLoadingIds(current => new Set(current).add(resource.id));
      try {
        const children = await loadChildren(resource);
        setChildrenById(current => ({ ...current, [resource.id]: children }));
      } finally {
        setLoadingIds(current => {
          const next = new Set(current);
          next.delete(resource.id);
          return next;
        });
      }
    }

    setExpandedIds(current => new Set(current).add(resource.id));
  };

  const renderResource = (
    resource: ResourcePickerResource,
    depth = 0
  ): ReactNode => {
    const children = childrenById[resource.id] ?? resource.children ?? [];
    const expanded = expandedIds.has(resource.id);
    const loading = loadingIds.has(resource.id);
    const canExpand = Boolean(resource.has_children || children.length > 0);
    const name = resource.name || t('untitled');

    const row = (
      <Button
        variant="ghost"
        disabled={resource.disabled}
        className={cn(
          'flex h-auto w-full min-w-0 items-center justify-start whitespace-normal rounded-md px-0 py-2 font-normal focus-visible:ring-0',
          resource.disabled && 'opacity-50'
        )}
        style={{ paddingLeft: depth * 16 + 8, paddingRight: 8 }}
        onClick={() => {
          if (!resource.disabled) onSelect(resource);
        }}
      >
        {canExpand ? (
          <span
            role="button"
            tabIndex={-1}
            className="mr-1 flex size-5 shrink-0 items-center justify-center"
            onClick={event => {
              event.preventDefault();
              event.stopPropagation();
              void toggleExpand(resource);
            }}
          >
            {loading ? (
              <Spinner />
            ) : (
              <Arrow
                className={cn(
                  'text-neutral-400 transition-transform',
                  expanded && 'rotate-90'
                )}
              />
            )}
          </span>
        ) : (
          <span className="mr-1 size-5 shrink-0" />
        )}
        <span className="size-4 shrink-0 [&>svg]:size-4">
          <ResourceIcon expand={expanded} resource={resource} />
        </span>
        <span className="ml-2 min-w-0 flex-1 truncate text-left">{name}</span>
      </Button>
    );

    return (
      <div key={resource.id}>
        {resource.disabledTooltip ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="block">{row}</span>
            </TooltipTrigger>
            <TooltipContent>{resource.disabledTooltip}</TooltipContent>
          </Tooltip>
        ) : (
          row
        )}
        {!search &&
          expanded &&
          children.map(child => renderResource(child, depth + 1))}
      </div>
    );
  };

  const visibleResources = search ? searchResults : roots;

  return (
    <div className="min-w-0">
      {searchResources && (
        <SearchField
          value={search}
          onValueChange={setSearch}
          debounceMs={1000}
          loading={searchLoading}
          placeholder={t('search.placeholder')}
          clearLabel={t('search.clear')}
          containerClassName="mb-2"
        />
      )}
      <div className="min-h-60 w-full min-w-0 max-h-80 overflow-y-auto overflow-x-hidden pb-2">
        {searchLoading && visibleResources.length === 0 ? (
          <div className="flex h-24 items-center justify-center">
            <Spinner />
          </div>
        ) : (
          visibleResources.map(resource => renderResource(resource))
        )}
      </div>
    </div>
  );
}

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
    fetchRootResources(namespaceId).then(response => {
      if (!cancelled) setRoots(workspaceRootsToPickerResources(response, t));
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
  const defaultExpandedRootIds = useMemo(
    () =>
      shouldAutoExpandSharedRoot(rootResource, canBrowseResources)
        ? [rootResource.id]
        : [],
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
      defaultExpandedRootIds={defaultExpandedRootIds}
      roots={roots}
      loadChildren={loadChildren}
      onSelect={onSelect}
    />
  );
}
