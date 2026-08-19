import { http } from '@/lib/request';

export interface PublicConversationShare {
  groups: Array<{
    answer: string;
    question: string;
  }>;
  id: string;
  summary: string;
  title: string;
}

export function fetchConversationShare(shareId: string) {
  return http.get<PublicConversationShare>(`/conversation-shares/${shareId}`, {
    mute: true,
  });
}
