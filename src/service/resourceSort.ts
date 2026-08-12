export type ResourceSortBy = 'updated_at' | 'created_at' | 'title' | 'manual';
export type ResourceSortOrder = 'asc' | 'desc';

export interface ResourceSortOptions {
  sort_by: ResourceSortBy;
  sort_order: ResourceSortOrder;
}

/**
 * RSS folders list their items newest-published first: the backend stores each
 * item's feed publish date as the resource's created_at.
 */
export const RSS_ITEM_SORT: ResourceSortOptions = {
  sort_by: 'created_at',
  sort_order: 'desc',
};
