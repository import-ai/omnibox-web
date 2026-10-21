import { http } from '@/lib/request';

export type MentionLabelSyncResult = {
  updated: number;
  content?: string;
  content_hash?: string;
};

export function syncCommentMentionLabels(
  namespaceId: string,
  resourceId: string
) {
  return http.post<MentionLabelSyncResult>(
    `/namespaces/${namespaceId}/resources/${resourceId}/comment-threads/mention-labels`
  );
}
