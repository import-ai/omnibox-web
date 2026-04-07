import { IBase } from '@/interface';
import type { ChatTool } from '@/page/chat/conversation/types';
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

export interface ToolCallMeta {
  tool_call_id: string;
  tool_name: string;
  tool_call_args: Record<string, any>;
}

export interface MessageAttrs {
  citations?: Citation[];
  tools?: ChatTool[];
  enable_thinking?: boolean;
  lang?: '简体中文' | 'English';
  error_message?: string;
  tool_call_meta?: ToolCallMeta;
}

export interface MessageDetail extends IBase {
  id: string;
  message: OpenAIMessage;
  status: MessageStatus;
  parent_id: string;
  children: string[];
  attrs?: MessageAttrs;
}

export interface ConversationDetail extends IBase {
  id: string;
  title?: string;
  mapping: Record<string, MessageDetail>;
  current_node?: string;
}
