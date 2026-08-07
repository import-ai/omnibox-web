import type { ResourceSortBy } from '@/service/resource';

export function getShareSortOrderOptions(sortBy: ResourceSortBy) {
  return sortBy === 'title'
    ? [
        { labelKey: 'az' as const, value: 'asc' as const },
        { labelKey: 'za' as const, value: 'desc' as const },
      ]
    : [
        { labelKey: 'oldest' as const, value: 'asc' as const },
        { labelKey: 'newest' as const, value: 'desc' as const },
      ];
}
