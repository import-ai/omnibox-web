import { http, type RequestConfig } from '@/lib/request';

import type { RssFolderResponse } from './index';

export function rssFolderConfigUrl(namespaceId: string, resourceId: string) {
  return `/namespaces/${namespaceId}/rss-folders/${resourceId}/config`;
}

/**
 * The single read path for an rss folder's config, shared by the edit dialog
 * and by the item rows that resolve their feed's name from it.
 */
export function fetchRssFolderConfig(
  namespaceId: string,
  resourceId: string,
  config?: RequestConfig
): Promise<RssFolderResponse> {
  return http.get(rssFolderConfigUrl(namespaceId, resourceId), config);
}
