import { IResTypeContext } from '@/page/chat/useContext.ts';
import { ToolType } from '@/page/chat/chat-input/types';
import {
  ChatRequestBody,
  KnowledgeSearch,
} from '@/page/chat/conversation/types.tsx';
import { MessageDetail } from '@/page/chat/interface.tsx';

export function getCondition(context: IResTypeContext[]) {
  const parents = context
    .filter((rc) => rc.type === 'parent')
    .map((rc) => rc.resource);
  const resources = context
    .filter((rc) => rc.type === 'resource')
    .map((rc) => rc.resource);
  return {
    parentIds: parents.length > 0 ? parents.map((r) => r.id) : undefined,
    resourceIds: resources.length > 0 ? resources.map((r) => r.id) : undefined,
  };
}

export function prepareBody(
  namespaceId: string,
  conversationId: string,
  query: string,
  tools: ToolType[],
  context: IResTypeContext[],
  messages: MessageDetail[],
): ChatRequestBody {
  const body: ChatRequestBody = {
    namespace_id: namespaceId,
    conversation_id: conversationId,
    query,
  };
  for (const tool of tools) {
    if (tool === ToolType.REASONING) {
      body.enable_thinking = true;
    } else if (tool === ToolType.KNOWLEDGE_SEARCH) {
      body.tools = body?.tools || [];
      const { parentIds, resourceIds } = getCondition(context);
      body.tools.push({
        name: tool,
        namespace_id: namespaceId,
        parent_ids: parentIds,
        resource_ids: resourceIds,
      } as KnowledgeSearch);
    } else if (tool === ToolType.WEB_SEARCH) {
      body.tools = body?.tools || [];
      body.tools.push({ name: tool });
    } else {
      throw new Error(`Unknown tool type: ${tool}`);
    }
  }

  if (messages.length > 0) {
    body.parent_message_id = messages[messages.length - 1].id;
  }
  return body;
}
