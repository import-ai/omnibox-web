import { ResourcePickerRow } from './ResourcePickerRow';
import type { ResourcePickerResource } from './resourcePickerTypes';

interface ResourcePickerTreeProps {
  childrenById: Record<string, ResourcePickerResource[]>;
  depth?: number;
  expandedIds: Set<string>;
  loadingIds: Set<string>;
  onSelect: (resource: ResourcePickerResource) => void;
  resources: ResourcePickerResource[];
  searchActive: boolean;
  selectedResourceId?: string;
  toggleExpand: (resource: ResourcePickerResource) => Promise<void>;
}

export function ResourcePickerTree({
  childrenById,
  depth = 0,
  expandedIds,
  loadingIds,
  onSelect,
  resources,
  searchActive,
  selectedResourceId,
  toggleExpand,
}: ResourcePickerTreeProps) {
  return resources.map(resource => {
    const children = childrenById[resource.id] ?? resource.children ?? [];
    const expanded = expandedIds.has(resource.id);
    return (
      <div key={resource.id} className="min-w-0 max-w-full overflow-hidden">
        <ResourcePickerRow
          canExpand={Boolean(resource.has_children || children.length > 0)}
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
        {!searchActive && expanded && (
          <ResourcePickerTree
            childrenById={childrenById}
            depth={depth + 1}
            expandedIds={expandedIds}
            loadingIds={loadingIds}
            onSelect={onSelect}
            resources={children}
            searchActive={searchActive}
            selectedResourceId={selectedResourceId}
            toggleExpand={toggleExpand}
          />
        )}
      </div>
    );
  });
}
