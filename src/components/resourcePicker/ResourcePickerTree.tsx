import { useTranslation } from 'react-i18next';

import { ResourcePickerRow } from './ResourcePickerRow';
import type { ResourcePickerResource } from './resourcePickerTypes';

interface ResourcePickerTreeProps {
  childrenById: Record<string, ResourcePickerResource[]>;
  depth?: number;
  enableManagedFolders: boolean;
  expandedIds: Set<string>;
  loadingIds: Set<string>;
  onSelect: (resource: ResourcePickerResource) => void;
  resources: ResourcePickerResource[];
  resourcesAreSmartFolderResults?: boolean;
  searchActive: boolean;
  selectedResourceId?: string;
  toggleExpand: (resource: ResourcePickerResource) => Promise<void>;
}

export function ResourcePickerTree({
  childrenById,
  depth = 0,
  enableManagedFolders,
  expandedIds,
  loadingIds,
  onSelect,
  resources,
  resourcesAreSmartFolderResults = false,
  searchActive,
  selectedResourceId,
  toggleExpand,
}: ResourcePickerTreeProps) {
  const { t } = useTranslation();

  return resources.map(resource => {
    const children = childrenById[resource.id] ?? resource.children ?? [];
    const terminalResult = searchActive || resourcesAreSmartFolderResults;
    const expanded = !terminalResult && expandedIds.has(resource.id);
    const managedFolder =
      resource.resource_type === 'smart_folder' ||
      resource.resource_type === 'rss_folder';
    const canBrowseManagedFolder = !managedFolder || enableManagedFolders;
    const childrenLoaded =
      Object.prototype.hasOwnProperty.call(childrenById, resource.id) ||
      resource.children !== undefined;
    return (
      <div key={resource.id} className="min-w-0 max-w-full overflow-hidden">
        <ResourcePickerRow
          canExpand={Boolean(
            !terminalResult &&
            canBrowseManagedFolder &&
            (!resource.disabled || expanded) &&
            ((enableManagedFolders && managedFolder) ||
              resource.has_children ||
              children.length > 0)
          )}
          depth={depth}
          expanded={expanded}
          loading={loadingIds.has(resource.id)}
          resource={resource}
          selected={resource.id === selectedResourceId}
          onSelect={() => {
            if (!resource.disabled) onSelect(resource);
          }}
          onToggle={() => void toggleExpand(resource)}
        />
        {!terminalResult && canBrowseManagedFolder && expanded && (
          <ResourcePickerTree
            childrenById={childrenById}
            depth={depth + 1}
            enableManagedFolders={enableManagedFolders}
            expandedIds={expandedIds}
            loadingIds={loadingIds}
            onSelect={onSelect}
            resources={children}
            resourcesAreSmartFolderResults={
              resource.resource_type === 'smart_folder'
            }
            searchActive={searchActive}
            selectedResourceId={selectedResourceId}
            toggleExpand={toggleExpand}
          />
        )}
        {!terminalResult &&
          enableManagedFolders &&
          managedFolder &&
          expanded &&
          childrenLoaded &&
          !loadingIds.has(resource.id) &&
          children.length === 0 && (
            <div
              className="py-2 text-sm text-muted-foreground"
              style={{ paddingLeft: (depth + 1) * 16 + 39 }}
            >
              {t('sidebar.folder_empty')}
            </div>
          )}
      </div>
    );
  });
}
