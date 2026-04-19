import { ResourceMeta } from '@/interface.ts';
import { ConversationDetail } from '@/page/chat/core/types/conversation.ts';

export enum ToolType {
  WEB_SEARCH = 'web_search',
  PRIVATE_SEARCH = 'private_search',
  REASONING = 'reasoning',
}

export type PrivateSearchResourceType = 'resource' | 'folder';

export interface IResTypeContext {
  type: PrivateSearchResourceType;
  resource: ResourceMeta;
}

export enum ChatMode {
  ASK = 'ask',
  WRITE = 'write',
}

export enum InputMode {
  TEXT = 'text',
  DECISION = 'decision',
}

export interface IChatTool {
  name: ToolType;
}

export interface WebSearch extends IChatTool {
  name: ToolType.WEB_SEARCH;
}

export interface PrivateSearchResource {
  name: string;
  id: string;
  type: PrivateSearchResourceType;
}

export interface PrivateSearch extends IChatTool {
  name: ToolType.PRIVATE_SEARCH;
  resources?: PrivateSearchResource[];
}

export interface Reasoning extends IChatTool {
  name: ToolType.REASONING;
}

export type ChatTool = WebSearch | PrivateSearch | Reasoning;

export interface ChatRequestBody {
  conversation_id: string;
  query: string;
  tools?: ChatTool[];
  parent_message_id?: string;
  enable_thinking: boolean;
  lang?: '简体中文' | 'English';
  namespace_id?: string;
  share_id?: string;
  share_password?: string;
  tool_call?: {
    decisions: {
      type: DecisionType;
    }[];
  };
}

export type DecisionType = 'approve' | 'reject';

export type Decision = {
  type: DecisionType;
};

export interface SendMessageParams {
  query: string;
  tools: ToolType[];
  selectedResources: IResTypeContext[];
  mode: ChatMode;
  decisions?: Decision[];
}

export interface ChatCreatePayload extends SendMessageParams {
  conversation: ConversationDetail;
}

export interface ConversationEntity {
  id: string;
  namespaceId: string;
  userId: string;
  title: string;
  shareId: string;
}
