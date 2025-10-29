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
  conversationId: string,
  query: string,
  tools: ToolType[],
  context: IResTypeContext[],
  messages: MessageDetail[],
  lang: WizardLang | undefined,
  parentMessageId?: string
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

  // 如果指定了 parentMessageId，使用它（重新编辑场景）
  // 否则使用最后一条消息作为父节点（正常对话场景）
  if (parentMessageId) {
    body.parent_message_id = parentMessageId;
  } else if (messages.length > 0) {
    // 正常对话：直接使用最后一条消息作为父节点
    const lastMessage = messages[messages.length - 1];
    body.parent_message_id = lastMessage.id;
  }

  console.log(
    '[API请求] parent_message_id:',
    body.parent_message_id,
    '| 消息数量:',
    messages.length
  );
  return body;
}

export function ask(
  conversationId: string,
  query: string,
  tools: ToolType[],
  context: IResTypeContext[],
  messages: MessageDetail[],
  messageOperator: MessageOperator,
  url: string,
  lang: WizardLang | undefined,
  namespaceId: string | undefined,
  shareId: string | undefined,
  sharePassword: string | undefined,
  parentMessageId?: string
) {
  const chatReq = prepareBody(
    conversationId,
    query,
    tools,
    context,
    messages,
    lang,
    parentMessageId
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
