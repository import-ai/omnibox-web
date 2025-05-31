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

export interface OpenAIMessage {
  role: OpenAIMessageRole;
  content?: string;
  reasoning_content?: string;
  tool_calls?: Record<string, any>[];
  tool_call_id?: string;
}

export interface MessageAttrs {
  citations?: Record<string, any>[];
}

export type ChatResponseType = 'bos' | 'delta' | 'eos' | 'done' | 'error';

export interface ChatBaseResponse {
  response_type: ChatResponseType;
}

export interface ChatBOSResponse extends ChatBaseResponse {
  response_type: 'bos';
  role: OpenAIMessageRole;
  id: string;
  parentId?: string;
}

export interface ChatEOSResponse extends ChatBaseResponse {
  response_type: 'eos';
}

export interface ChatDeltaResponse extends ChatBaseResponse {
  response_type: 'delta';
  message: Partial<OpenAIMessage>;
  attrs?: MessageAttrs;
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
  | ChatDoneResponse
  | ChatErrorResponse;
