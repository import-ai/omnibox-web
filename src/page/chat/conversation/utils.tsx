import { IResTypeContext } from '@/page/chat/useContext';
import { ToolType } from '@/page/chat/chat-input/types';
import {
  ChatRequestBody,
  KnowledgeSearch,
} from '@/page/chat/conversation/types';
import { MessageDetail } from '@/page/chat/types/conversation';
import { stream } from '@/page/chat/utils';
import { ChatResponse } from '@/page/chat/types/chat-response';
import { MessageOperator } from '@/page/chat/conversation/message-operator';

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
  if (context.length > 0 && !tools.includes(ToolType.KNOWLEDGE_SEARCH)) {
    tools = [ToolType.KNOWLEDGE_SEARCH, ...tools];
  }
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

export async function ask(
  namespaceId: string,
  conversationId: string,
  query: string,
  tools: ToolType[],
  context: IResTypeContext[],
  messages: MessageDetail[],
  messageOperator: MessageOperator,
): Promise<void> {
  const body = prepareBody(
    namespaceId,
    conversationId,
    query,
    tools,
    context,
    messages,
  );
  await stream('/api/v1/wizard/ask', body, async (data) => {
    let chatResponse: ChatResponse = JSON.parse(data);

    if (chatResponse.response_type === 'bos') {
      messageOperator.add(chatResponse);
    } else if (chatResponse.response_type === 'delta') {
      messageOperator.update(chatResponse);
    } else if (chatResponse.response_type === 'eos') {
      messageOperator.done();
    } else if (chatResponse.response_type === 'done') {
    } else if (chatResponse.response_type === 'error') {
      console.error(chatResponse);
    } else {
      console.error({ message: 'Unknown response type', chatResponse });
    }
  });
}
