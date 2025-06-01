import { ToolType } from '@/page/chat/chat-input/types';

export interface IChatTool {
  name: ToolType;
}

export interface WebSearch extends IChatTool {
  name: ToolType.WEB_SEARCH;
}

export interface KnowledgeSearch extends IChatTool {
  name: ToolType.KNOWLEDGE_SEARCH;
  namespace_id: string;
  parent_ids: string[];
  resource_ids: string[];
}

export interface Reasoning extends IChatTool {
  name: ToolType.REASONING;
}

type ChatTool = WebSearch | KnowledgeSearch | Reasoning;

export interface ChatRequestBody {
  namespace_id: string;
  conversation_id: string;
  query: string;
  tools?: ChatTool[];
  parent_message_id?: string;
  enable_thinking?: boolean;
}
