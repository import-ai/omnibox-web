import { getWizardLang } from '@/lib/wizard-lang';
import { type IResTypeContext, ToolType } from '@/page/chat/chat-input/types';
import { MessageOperator } from '@/page/chat/conversation/message-operator';
import { ChatResponse } from '@/page/chat/types/chat-response';
import { MessageDetail } from '@/page/chat/types/conversation';
import { stream } from '@/page/chat/utils';

import type {
  PrivateSearchResource,
  SharedChatRequestBody,
  SharedPrivateSearch,
} from './types';

function getPrivateSearchResources(
  context: IResTypeContext[]
): PrivateSearchResource[] {
  return context.map(item => {
    return {
      name: item.resource.name || '',
      id: item.resource.id,
      type: item.type,
    } as PrivateSearchResource;
  });
}

export function prepareBody(
  shareId: string,
  conversationId: string,
  query: string,
  tools: ToolType[],
  context: IResTypeContext[],
  messages: MessageDetail[]
): SharedChatRequestBody {
  const body: SharedChatRequestBody = {
    share_id: shareId,
    conversation_id: conversationId,
    query,
    enable_thinking: false,
    lang: getWizardLang(),
  };
  if (context.length > 0 && !tools.includes(ToolType.PRIVATE_SEARCH)) {
    tools = [ToolType.PRIVATE_SEARCH, ...tools];
  }
  for (const tool of tools) {
    if (tool === ToolType.REASONING) {
      body.enable_thinking = true;
    } else if (tool === ToolType.PRIVATE_SEARCH) {
      body.tools = body?.tools || [];
      const tool: SharedPrivateSearch = {
        name: ToolType.PRIVATE_SEARCH,
        share_id: shareId,
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
  shareId: string,
  conversationId: string,
  query: string,
  tools: ToolType[],
  context: IResTypeContext[],
  messages: MessageDetail[],
  messageOperator: MessageOperator
) {
  const body = prepareBody(
    shareId,
    conversationId,
    query,
    tools,
    context,
    messages
  );
  return stream(`/api/v1/shares/${shareId}/ask`, body, async data => {
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
