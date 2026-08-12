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

/**
 * How many items the sidebar loads when an rss folder is expanded. A feed can
 * hold thousands of articles and the tree renders every row it is given, so the
 * branch shows the newest page rather than the whole archive; the folder page
 * is where a reader browses further back.
 */
export const RSS_ITEM_TREE_LIMIT = 50;

/**
 * Request params that bound an rss folder's children in the tree. Any other
 * resource type is listed in full, as before.
 */
export function rssTreeChildrenParams(
  resourceType?: string
): { limit: number } | undefined {
  return resourceType === 'rss_folder'
    ? { limit: RSS_ITEM_TREE_LIMIT }
    : undefined;
}
