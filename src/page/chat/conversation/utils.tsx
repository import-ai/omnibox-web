import { isBoolean } from 'lodash-es';
import { stream } from '@/page/chat/utils';
import { MessageDetail } from '@/page/chat/types/conversation';
import { ChatResponse } from '@/page/chat/types/chat-response';
import { MessageOperator } from '@/page/chat/conversation/message-operator';
import {
  ChatMode,
  ToolType,
  type IResTypeContext,
} from '@/page/chat/chat-input/types';
import type {
  PrivateSearch,
  ChatRequestBody,
  PrivateSearchResource,
} from '@/page/chat/conversation/types';

function getPrivateSearchResources(
  context: IResTypeContext[],
): PrivateSearchResource[] {
  return context.map((item) => {
    return {
      name: item.resource.name || '',
      id: item.resource.id,
      type: item.type,
    } as PrivateSearchResource;
  });
}

export function prepareBody(
  namespaceId: string,
  conversationId: string,
  query: string,
  tools: ToolType[],
  thinking: boolean | '',
  context: IResTypeContext[],
  messages: MessageDetail[],
): ChatRequestBody {
  const body: ChatRequestBody = {
    namespace_id: namespaceId,
    conversation_id: conversationId,
    query,
  };
  if (isBoolean(thinking)) {
    body.enable_thinking = thinking;
  }
  if (context.length > 0 && !tools.includes(ToolType.PRIVATE_SEARCH)) {
    tools = [ToolType.PRIVATE_SEARCH, ...tools];
  }
  for (const tool of tools) {
    if (tool === ToolType.PRIVATE_SEARCH) {
      body.tools = body?.tools || [];
      const tool: PrivateSearch = {
        name: ToolType.PRIVATE_SEARCH,
        namespace_id: namespaceId,
        resources: getPrivateSearchResources(context),
      };
      body.tools.push(tool);
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

export function ask(
  namespaceId: string,
  conversationId: string,
  query: string,
  tools: ToolType[],
  thinking: boolean | '',
  context: IResTypeContext[],
  messages: MessageDetail[],
  messageOperator: MessageOperator,
  mode: ChatMode = ChatMode.ASK,
) {
  const body = prepareBody(
    namespaceId,
    conversationId,
    query,
    tools,
    thinking,
    context,
    messages,
  );
  return stream(`/api/v1/wizard/${mode}`, body, async (data) => {
    const chatResponse: ChatResponse = JSON.parse(data);
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
