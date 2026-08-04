import type { ResourceSortBy, ResourceSortOptions } from '@/service/resource';

export function getNextShareSort(
  sort: ResourceSortOptions,
  sortBy: ResourceSortBy
): ResourceSortOptions {
  if (sortBy === 'manual') {
    return { sort_by: 'manual', sort_order: 'asc' };
  }

  const sortOrder =
    sort.sort_by === sortBy
      ? sort.sort_order === 'desc'
        ? 'asc'
        : 'desc'
      : sortBy === 'title'
        ? 'asc'
        : 'desc';
  return { sort_by: sortBy, sort_order: sortOrder };
}
