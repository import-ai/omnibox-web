import { createStreamTransport } from '@/lib/stream-transport';
import { WizardLang } from '@/lib/wizard-lang';
import { IResTypeContext, ToolType } from '@/page/chat/chat-input/types';
import { MessageOperator } from '@/page/chat/conversation/message-operator';
import type {
  ChatRequestBody,
  PrivateSearch,
  PrivateSearchResource,
} from '@/page/chat/conversation/types';
import { ChatResponse } from '@/page/chat/types/chat-response';

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
  conversationId: string,
  query: string,
  tools: ToolType[],
  context: IResTypeContext[],
  parent_message_id: string | undefined,
  lang: WizardLang | undefined
): ChatRequestBody {
  const body: ChatRequestBody = {
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

  if (parent_message_id) {
    body.parent_message_id = parent_message_id;
  }
  return body;
}

export function ask(
  conversationId: string,
  query: string,
  tools: ToolType[],
  context: IResTypeContext[],
  parent_message_id: string | undefined,
  messageOperator: MessageOperator,
  url: string,
  lang: WizardLang | undefined,
  namespaceId: string | undefined,
  shareId: string | undefined,
  sharePassword: string | undefined
) {
  const chatReq = prepareBody(
    conversationId,
    query,
    tools,
    context,
    parent_message_id,
    lang
  );
  chatReq.namespace_id = namespaceId;
  chatReq.share_id = shareId;
  chatReq.share_password = sharePassword;
  return createStreamTransport(url, chatReq, async data => {
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
