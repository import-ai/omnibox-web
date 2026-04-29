import { MessageAttrs } from '@/page/chat/core/types/conversation.ts';

export enum MessageStatus {
  PENDING = 'pending',
  STREAMING = 'streaming',
  SUCCESS = 'success',
  STOPPED = 'stopped',
  INTERRUPTED = 'interrupted',
  FAILED = 'failed',
}

export enum OpenAIMessageRole {
  SYSTEM = 'system',
  USER = 'user',
  ASSISTANT = 'assistant',
  TOOL = 'tool',
}

export interface Citation {
  id: string;
  title: string;
  snippet: string;
  link: string;
  cite_ref?: string;
}

export interface OpenAIFunction {
  name: string;
  arguments: string;
}

export interface OpenAIToolCall {
  id: string;
  type: 'function';
  function: OpenAIFunction;
}

export interface OpenAIMessage {
  role: OpenAIMessageRole;
  content?: string;
  reasoning_content?: string;
  tool_calls?: OpenAIToolCall[];
  tool_call_id?: string;
}

export type ChatResponseType =
  | 'bos'
  | 'delta'
  | 'eos'
  | 'done'
  | 'error'
  | 'metrics';

export interface ChatBaseResponse {
  response_type: ChatResponseType;
}

export interface ChatBOSResponse extends ChatBaseResponse {
  response_type: 'bos';
  role: OpenAIMessageRole;
  id: string;
  parentId: string;
}

export interface ChatEOSResponse extends ChatBaseResponse {
  response_type: 'eos';
}

export interface ChatDeltaResponse extends ChatBaseResponse {
  response_type: 'delta';
  message: Partial<OpenAIMessage>;
  attrs?: MessageAttrs;
}

export interface ChatMetricsResponse extends ChatBaseResponse {
  response_type: 'metrics';
  tps: number;
  tokens: number;
}

export interface ChatDoneResponse extends ChatBaseResponse {
  response_type: 'done';
}

export interface ChatErrorResponse extends ChatBaseResponse {
  response_type: 'error';
  message: string;
}

export type ChatResponse =
  | ChatBOSResponse
  | ChatDeltaResponse
  | ChatEOSResponse
  | ChatMetricsResponse
  | ChatDoneResponse
  | ChatErrorResponse;
