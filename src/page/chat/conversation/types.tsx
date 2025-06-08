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

export interface PrivateSearch extends IChatTool {
  name: ToolType.PRIVATE_SEARCH;
  namespace_id: string;
  resources?: PrivateSearchResource[];
}

export interface Reasoning extends IChatTool {
  name: ToolType.REASONING;
}

type ChatTool = WebSearch | PrivateSearch | Reasoning;

export interface ChatRequestBody {
  namespace_id: string;
  conversation_id: string;
  query: string;
  tools?: ChatTool[];
  parent_message_id?: string;
  enable_thinking?: boolean;
}
