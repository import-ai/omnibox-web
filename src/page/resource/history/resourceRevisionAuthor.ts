import type { ResourceRevisionAuthor } from '@/service/resource';

export function resourceRevisionAuthorDisplayName(
  author: ResourceRevisionAuthor | null | undefined
) {
  return author?.display_name?.trim() || author?.username?.trim() || '';
}
