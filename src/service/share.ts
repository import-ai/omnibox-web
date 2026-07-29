import { Resource, RssItem, RssItemDetail } from '@/interface';
import { http } from '@/lib/request';

export function fetchShareChildren(shareId: string, id: string) {
  return http.get<Resource[]>(`/shares/${shareId}/resources/${id}/children`);
}

export function fetchShareResource(shareId: string, targetId: string) {
  return http.get<Resource>(`/shares/${shareId}/resources/${targetId}`, {
    mute: true,
  });
}

// Lists the items of a shared rss folder. Items are the folder's content, so
// access is authorized by the folder's share token — there is no per-item share.
export function fetchShareRssItems(
  shareId: string,
  folderId: string,
  options?: { limit?: number; offset?: number; signal?: AbortSignal }
) {
  const params = new URLSearchParams();
  if (options?.limit !== undefined) {
    params.set('limit', String(options.limit));
  }
  if (options?.offset !== undefined) {
    params.set('offset', String(options.offset));
  }
  const query = params.toString() ? `?${params}` : '';
  return http.get<RssItem[]>(
    `/shares/${shareId}/resources/${folderId}/rss-items${query}`,
    { signal: options?.signal }
  );
}

export function fetchShareRssItem(
  shareId: string,
  folderId: string,
  itemId: string,
  signal?: AbortSignal
) {
  return http.get<RssItemDetail>(
    `/shares/${shareId}/resources/${folderId}/rss-items/${itemId}`,
    { signal }
  );
}
