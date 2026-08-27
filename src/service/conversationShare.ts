import { http } from '@/lib/request';

export type ConversationShareChannel =
  'copy_link' | 'wechat_session' | 'wechat_timeline';

export interface CreateConversationShareRequest {
  channel: ConversationShareChannel;
  conversation_id: string;
  group_ids: string[];
}

export interface ConversationShareSnapshot {
  id: string;
  url: string;
  title: string;
  summary: string;
}

/** Creates an immutable public snapshot for the selected conversation groups. */
export async function createConversationShare(
  namespaceId: string,
  request: CreateConversationShareRequest
): Promise<ConversationShareSnapshot> {
  const snapshot = await http.post<ConversationShareSnapshot>(
    `/namespaces/${namespaceId}/conversation-shares`,
    request,
    { mute: true }
  );

  if (!snapshot?.id || !snapshot?.url) {
    throw new Error('Conversation share response is incomplete');
  }

  return snapshot;
}
