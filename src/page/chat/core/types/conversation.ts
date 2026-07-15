import { IBase } from '@/interface.ts';
import type {
  ChatMessageDisplayPart,
  ChatTool,
  DecisionType,
} from '@/page/chat/chat-input/types';
import type {
  Citation,
  MessageStatus,
  OpenAIMessage,
} from '@/page/chat/core/types/chatResponse.ts';

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
  compact?: {
    status: 'compacting' | 'compacted';
  };
  user_context?: {
    selected_resources?: string[];
  };
  // frontend only
  composer?: {
    display_parts?: ChatMessageDisplayPart[];
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
  usage?: {
    total_tokens?: number;
    context_compact?: {
      estimated_tokens?: number;
      trigger_tokens?: number;
    };
    [key: string]: any;
  };
  stream_event_id?: string;
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
