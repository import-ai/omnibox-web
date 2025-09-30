import { createStreamTransport } from '@/lib/stream-transport';
import { WizardLang } from '@/lib/wizard-lang';
import {
  ChatMode,
  type IResTypeContext,
  ToolType,
} from '@/page/chat/chat-input/types';
import { MessageOperator } from '@/page/chat/conversation/message-operator';
import type {
  ChatRequestBody,
  PrivateSearch,
  PrivateSearchResource,
} from '@/page/chat/conversation/types';
import { ChatResponse } from '@/page/chat/types/chat-response';
import { MessageDetail } from '@/page/chat/types/conversation';

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
  namespaceId: string,
  conversationId: string,
  query: string,
  tools: ToolType[],
  context: IResTypeContext[],
  messages: MessageDetail[],
  lang: WizardLang | undefined
): ChatRequestBody {
  const body: ChatRequestBody = {
    namespace_id: namespaceId,
    conversation_id: conversationId,
    query,
    enable_thinking: false,
    lang,
  };
  if (context.length > 0 && !tools.includes(ToolType.PRIVATE_SEARCH)) {
    tools = [ToolType.PRIVATE_SEARCH, ...tools];
  }
  for (const tool of tools) {
    if (tool === ToolType.REASONING) {
      body.enable_thinking = true;
    } else if (tool === ToolType.PRIVATE_SEARCH) {
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
  context: IResTypeContext[],
  messages: MessageDetail[],
  messageOperator: MessageOperator,
  mode: ChatMode,
  lang: WizardLang | undefined
) {
  const body = prepareBody(
    namespaceId,
    conversationId,
    query,
    tools,
    context,
    messages,
    lang
  );
  return createStreamTransport(`/api/v1/wizard/${mode}`, body, async data => {
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
