import type { ConversationShareInitialSelection } from './conversationShareGroups';

export const CONVERSATION_SHARE_OPEN_EVENT = 'chat:conversation-share:open';
export const CONVERSATION_SHARE_STATE_EVENT = 'chat:conversation-share:state';

export interface ConversationShareOpenEvent {
  conversationId: string;
  initialSelection: ConversationShareInitialSelection;
  targetMessageId?: string;
}

export interface ConversationShareViewState {
  conversationId: string;
  isSelecting: boolean;
}
