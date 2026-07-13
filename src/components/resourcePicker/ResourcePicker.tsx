import { useTranslation } from 'react-i18next';

import { SearchField } from '@/components/search/SearchField';
import { Spinner } from '@/components/ui/Spinner';

import { ResourcePickerTree } from './ResourcePickerTree';
import type { ResourcePickerResource } from './resourcePickerTypes';
import { useResourcePickerController } from './useResourcePickerController';

export type { ResourcePickerResource } from './resourcePickerTypes';

const emptyDefaultExpandedRootIds: string[] = [];

interface ResourcePickerProps {
  defaultExpandedRootIds?: string[];
  expandAllInitially?: boolean;
  roots: ResourcePickerResource[];
  loadChildren: (
    resource: ResourcePickerResource
  ) => Promise<ResourcePickerResource[]>;
  searchResources?: (query: string) => Promise<ResourcePickerResource[]>;
  onSelect: (resource: ResourcePickerResource) => void;
}

/** Renders a searchable, asynchronously expandable resource tree. */
export function ResourcePicker({
  defaultExpandedRootIds = emptyDefaultExpandedRootIds,
  expandAllInitially = false,
  roots,
  loadChildren,
  searchResources,
  onSelect,
}: ResourcePickerProps) {
  const { t } = useTranslation();
  const controller = useResourcePickerController(
    { defaultExpandedRootIds, expandAllInitially, loadChildren, roots },
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
          placeholder={t('search.placeholder')}
          clearLabel={t('search.clear')}
          containerClassName="mb-2"
        />
      )}
      <div className="min-h-60 w-full min-w-0 max-h-80 overflow-y-auto overflow-x-hidden pb-2">
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
            toggleExpand={controller.toggleExpand}
          />
        )}
      </div>
    </div>
  );
}
