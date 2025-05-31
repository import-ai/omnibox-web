import { IBase } from '@/interface.ts';
import {
  MessageStatus,
  OpenAIMessage,
} from '@/page/chat/types/chat-response.tsx';

export interface MessageDetail extends IBase {
  id: string;
  message: OpenAIMessage;
  status: MessageStatus;
  parentId?: string;
  children: string[];
  attrs?: { citations?: Record<string, any>[] };
}

export interface ConversationDetail extends IBase {
  id: string;
  title?: string;
  mapping: Record<string, MessageDetail>;
  current_node?: string;
}
