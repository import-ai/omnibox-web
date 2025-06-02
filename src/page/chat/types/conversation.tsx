import { IBase } from '@/interface';
import type {
  Citation,
  MessageStatus,
  OpenAIMessage,
} from '@/page/chat/types/chat-response';

export interface ConversationSummary extends IBase {
  id: string;
  title: string;
  user_content?: string;
  assistant_content?: string;
}

export interface MessageDetail extends IBase {
  id: string;
  message: OpenAIMessage;
  status: MessageStatus;
  parent_id?: string;
  children: string[];
  attrs?: { citations?: Citation[] };
}

export interface ConversationDetail extends IBase {
  id: string;
  title?: string;
  mapping: Record<string, MessageDetail>;
  current_node?: string;
}
