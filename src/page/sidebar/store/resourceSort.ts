import type { SpaceType } from '@/interface';
import type { ResourceSortOptions } from '@/service/resource';

export type ResourceSorts = Record<SpaceType, ResourceSortOptions>;

const defaultSort: ResourceSortOptions = {
  sort_by: 'updated_at',
  sort_order: 'desc',
};

export function createDefaultResourceSorts(): ResourceSorts {
  return {
    private: { ...defaultSort },
    teamspace: { ...defaultSort },
  };
}

function isResourceSort(value: unknown): value is ResourceSortOptions {
  if (!value || typeof value !== 'object') return false;
  const sort = value as Partial<ResourceSortOptions>;
  return (
    ['updated_at', 'created_at', 'title', 'manual'].includes(
      sort.sort_by ?? ''
    ) && ['asc', 'desc'].includes(sort.sort_order ?? '')
  );
}

export function parseResourceSorts(raw: string | null): ResourceSorts {
  const defaults = createDefaultResourceSorts();
  if (!raw) return defaults;

  try {
    const value: unknown = JSON.parse(raw);
    if (isResourceSort(value)) {
      return { private: { ...value }, teamspace: { ...value } };
    }
    if (!value || typeof value !== 'object') return defaults;
    const stored = value as Partial<Record<SpaceType, unknown>>;
    return {
      private: isResourceSort(stored.private)
        ? stored.private
        : defaults.private,
      teamspace: isResourceSort(stored.teamspace)
        ? stored.teamspace
        : defaults.teamspace,
    };
  } catch {
    return defaults;
  }
}
