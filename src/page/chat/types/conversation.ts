import { IBase } from '@/interface';
import type { ChatTool, DecisionType } from '@/page/chat/conversation/types';
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

export interface ToolCallFrontendOperation {
  name: string;
  resource_id: string;
}

export interface MessageAttrs {
  citations?: Citation[];
  tools?: ChatTool[];
  enable_thinking?: boolean;
  lang?: '简体中文' | 'English';
  error_message?: string;
  user_context?: {
    selected_resources?: string[];
  };
  tool_call?: {
    status: string;
    error?: string;
    interrupts?: {
      args: Record<string, any>;
      name: string;
      decisions: string[];
    }[];
    decisions?: {
      type: DecisionType;
    }[];
    operations?: ToolCallFrontendOperation[];
    in_streaming?: boolean; // if the message is ended in streaming
  };
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
