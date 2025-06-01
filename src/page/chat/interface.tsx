import { IBase } from '@/interface';

export interface ConversationSummary extends IBase {
  id: string;
  title: string;
  user_content?: string;
  assistant_content?: string;
}

export interface Message {
  id?: string;
  role: 'user' | 'assistant' | 'tool';
  content: string;
}

export interface ChatBaseResponse {
  response_type:
    | 'delta'
    | 'think_delta'
    | 'citations'
    | 'done'
    | 'tool_call'
    | 'end_of_message'
    | 'error';
}

export interface ErrorResponse extends ChatBaseResponse {
  response_type: 'error';
  message: string;
}

export interface ChatDeltaResponse extends ChatBaseResponse {
  response_type: 'delta';
  delta: string;
}

export interface ChatThinkDeltaResponse extends ChatBaseResponse {
  response_type: 'think_delta';
  delta: string;
}

export interface Function {
  name: string;
  arguments: Record<string, any>;
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: Function;
}

export interface TollCallResponse extends ChatBaseResponse {
  response_type: 'tool_call';
  tool_call: ToolCall;
}

export interface ChatDoneResponse extends ChatBaseResponse {
  response_type: 'done';
}

export interface Citation {
  title: string;
  snippet: string;
  link: string;
}

export interface ChatCitationsResponse extends ChatBaseResponse {
  response_type: 'citations';
  citations: Citation[];
}

export interface EndOfMessage extends ChatBaseResponse {
  response_type: 'end_of_message';
  role: 'user' | 'assistant' | 'tool_call';
  messageId: string;
}
