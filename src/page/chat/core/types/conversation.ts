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
  last_message?: {
    role: 'user' | 'assistant';
    content: string;
  };
}

export interface ConversationTitleGeneratedPayload {
  userId: string;
  namespaceId: string;
  conversation: ConversationSummary;
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

export interface AnswerTiming {
  version: 1;
  answer_id: string;
  run_id: string;
  started_at: string;
  ended_at?: string;
  previous_duration_ms: number | null;
  duration_ms?: number | null;
  outcome: 'running' | 'paused' | 'success' | 'failed' | 'stopped';
}

export interface MessageAttrs {
  answer_timing?: AnswerTiming;
  turn_status?: 'stopped';
  turn_run_id?: string;
  stopped_run_id?: string;
  client_request_id?: string;
  pending_query?: boolean; // frontend only
  citations?: Citation[];
  tools?: ChatTool[];
  enable_thinking?: boolean;
  edition?: 'basic' | 'pro';
  level?: string;
  lang?: '简体中文' | 'English';
  error_message?: string;
  error_code?: string;
  error_status?: number;
  compact?: {
    status: 'compacting' | 'compacted';
  };
  user_context?: {
    selected_resources?: string[];
    channel?: string;
    saved_resource?: {
      resource_id: string;
      resource_type: string;
      created_at: string;
      file_name?: string;
      url?: string;
    };
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
  localRevision?: number;
  details_loaded?: boolean;
  has_reasoning?: boolean;
  tool_call_summaries?: { id: string; name: string }[];
  sibling_ids?: string[];
  clientKey: number;
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
  branch_leaf_id?: string;
  offset?: number;
  limit?: number;
  total?: number;
  has_more?: boolean;
  shareable_total?: number;
  citations?: Citation[];
  citation_total?: number;
}
