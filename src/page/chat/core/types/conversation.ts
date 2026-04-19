import { IBase } from '@/interface.ts';
import type { ChatTool, DecisionType } from '@/page/chat/chat-input/types';
import type {
  Citation,
  MessageStatus,
  OpenAIMessage,
} from '@/page/chat/core/types/chat-response.ts';

export interface ConversationSummary extends IBase {
  id: string;
  title: string;
  user_content?: string;
  assistant_content?: string;
}

export interface ToolCallFrontendOperation {
  name: string;
  args?: {
    resource_id?: string;
  };
}

export type Interrupt = {
  args: Record<string, any>;
  name: string;
  decisions: string[];
};

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
    interrupts?: Interrupt[];
    decisions?: {
      type: DecisionType;
    }[];
    operations?: ToolCallFrontendOperation[];
    in_streaming?: boolean; // frontend only
  };
  // frontend only
  metrics?: {
    tps?: number;
    tokens?: number;
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
