import {
  PrivateSearchResourceType,
  ToolType,
} from '@/page/chat/chat-input/types';

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

export interface SharedPrivateSearch extends IChatTool {
  name: ToolType.PRIVATE_SEARCH;
  share_id: string;
  resources?: PrivateSearchResource[];
}

export interface Reasoning extends IChatTool {
  name: ToolType.REASONING;
}

type SharedChatTool = WebSearch | SharedPrivateSearch | Reasoning;

export interface SharedChatRequestBody {
  share_id: string;
  conversation_id: string;
  query: string;
  tools?: SharedChatTool[];
  parent_message_id?: string;
  enable_thinking: boolean;
  lang?: '简体中文' | 'English';
}
