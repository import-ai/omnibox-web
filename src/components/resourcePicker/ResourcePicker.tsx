import type { KeyboardEventHandler, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { SearchField } from '@/components/search/SearchField';
import { Spinner } from '@/components/ui/Spinner';
import { cn } from '@/lib/utils';

import { ResourcePickerTree } from './ResourcePickerTree';
import type { ResourcePickerResource } from './resourcePickerTypes';
import { useResourcePickerController } from './useResourcePickerController';

export type { ResourcePickerResource } from './resourcePickerTypes';

const emptyDefaultExpandedRootIds: string[] = [];
const emptyDefaultExpandedIds: string[] = [];

interface ResourcePickerProps {
  defaultExpandedIds?: string[];
  defaultExpandedRootIds?: string[];
  expandAllInitially?: boolean;
  initialChildrenById?: Record<string, ResourcePickerResource[]>;
  roots: ResourcePickerResource[];
  loadChildren: (
    resource: ResourcePickerResource
  ) => Promise<ResourcePickerResource[]>;
  searchResources?: (query: string) => Promise<ResourcePickerResource[]>;
  searchPlaceholder?: string;
  searchContainerClassName?: string;
  searchInputClassName?: string;
  searchOnKeyDown?: KeyboardEventHandler<HTMLInputElement>;
  beforeList?: ReactNode;
  listClassName?: string;
  selectedResourceId?: string;
  onSelect: (resource: ResourcePickerResource) => void;
}

/** Renders a searchable, asynchronously expandable resource tree. */
export function ResourcePicker({
  defaultExpandedIds = emptyDefaultExpandedIds,
  defaultExpandedRootIds = emptyDefaultExpandedRootIds,
  expandAllInitially = false,
  initialChildrenById,
  roots,
  loadChildren,
  searchResources,
  searchPlaceholder,
  searchContainerClassName,
  searchInputClassName,
  searchOnKeyDown,
  beforeList,
  listClassName,
  selectedResourceId,
  onSelect,
}: ResourcePickerProps) {
  const { t } = useTranslation();
  const controller = useResourcePickerController(
    {
      defaultExpandedIds,
      defaultExpandedRootIds,
      expandAllInitially,
      initialChildrenById,
      loadChildren,
      roots,
    },
    { searchResources }
  );
  const visibleResources = controller.search ? controller.searchResults : roots;

  return (
    <div className="min-w-0">
      {searchResources && (
        <SearchField
          value={controller.search}
          onValueChange={controller.setSearch}
          debounceMs={1000}
          loading={controller.searchLoading}
          placeholder={searchPlaceholder ?? t('search.placeholder')}
          clearLabel={t('search.clear')}
          onKeyDown={searchOnKeyDown}
          containerClassName={cn('mb-2', searchContainerClassName)}
          inputClassName={searchInputClassName}
        />
      )}
      {beforeList}
      <div
        className={cn(
          'min-h-60 w-full min-w-0 max-h-80 overflow-y-auto overflow-x-hidden pb-2',
          listClassName
        )}
      >
        {controller.searchFailed ? (
          <div
            role="alert"
            className="flex h-24 items-center justify-center text-sm text-muted-foreground"
          >
            {t('resource_picker.search_failed')}
          </div>
        ) : controller.searchLoading && visibleResources.length === 0 ? (
          <div className="flex h-24 items-center justify-center">
            <Spinner />
          </div>
        ) : visibleResources.length === 0 ? (
          <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">
            {t(
              controller.search
                ? 'resource_picker.no_results'
                : 'resource_picker.empty'
            )}
          </div>
        ) : (
          <ResourcePickerTree
            childrenById={controller.childrenById}
            expandedIds={controller.expandedIds}
            loadingIds={controller.loadingIds}
            onSelect={onSelect}
            resources={visibleResources}
            searchActive={Boolean(controller.search)}
            selectedResourceId={selectedResourceId}
            toggleExpand={controller.toggleExpand}
          />
        )}
      </div>
    </div>
  );
}
