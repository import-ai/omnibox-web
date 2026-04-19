import {
  ChatMode,
  type IResTypeContext,
  ToolType,
} from '@/page/chat/chat-input/types.tsx';
import { ConversationDetail } from '@/page/chat/core/types/conversation.ts';

export type ConversationEntity = {
  id: string;
  namespaceId: string;
  userId: string;
  title: string;
  shareId: string;
};

export type ChatCreatePayload = {
  context: IResTypeContext[];
  query: string;
  tools: ToolType[];
  mode: ChatMode;
  conversation: ConversationDetail;
};
