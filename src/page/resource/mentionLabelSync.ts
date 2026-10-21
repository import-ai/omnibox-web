import type { Resource } from '@/interface';
import { http } from '@/lib/request';

import type { ResourceCommentAnchorSync } from './comments/commentAnchors';

export function saveResourceMentionLabels(
  namespaceId: string,
  resourceId: string,
  content: string,
  contentHash?: string,
  anchors?: ResourceCommentAnchorSync | null
) {
  return http.patch<Resource>(
    `/namespaces/${namespaceId}/resources/${resourceId}`,
    {
      content,
      namespaceId,
      ...(contentHash
        ? {
            expected_content_hash: contentHash,
            ...(anchors ?? {}),
          }
        : {}),
    }
  ) as Promise<Resource>;
}

export function syncCommentMentionLabels(
  namespaceId: string,
  resourceId: string
) {
  return http.post<{ updated: number }>(
    `/namespaces/${namespaceId}/resources/${resourceId}/comment-threads/mention-labels`
  );
}
