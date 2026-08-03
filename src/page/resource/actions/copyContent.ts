import { fetchRssItem } from '@/service/resource';

export function getCopyContent(
  namespaceId: string,
  resourceId: string,
  content?: string,
  rssItemId?: string
): Promise<string | null | undefined> {
  if (!rssItemId) {
    return Promise.resolve(content);
  }

  return fetchRssItem(namespaceId, resourceId, rssItemId).then(
    item => item.parsed_content
  );
}
