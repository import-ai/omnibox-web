import { toast } from 'sonner';

import { createStreamTransport } from '@/lib/stream-transport';
import { WizardLang } from '@/lib/wizard-lang';
import { IResTypeContext, ToolType } from '@/page/chat/chat-input/types';
import { MessageOperator } from '@/page/chat/conversation/message-operator';
import type {
  ChatRequestBody,
  ChatTool,
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

/**
 * Convert ChatTool[] from backend to ToolType[] and IResTypeContext[] for UI
 */
export function extractToolsAndContext(chatTools: ChatTool[]): {
  tools: ToolType[];
  context: IResTypeContext[];
} {
  const tools: ToolType[] = [];
  const context: IResTypeContext[] = [];

  for (const tool of chatTools) {
    if (tool.name === ToolType.PRIVATE_SEARCH) {
      tools.push(ToolType.PRIVATE_SEARCH);
      if ('resources' in tool && tool.resources) {
        for (const res of tool.resources) {
          context.push({
            type: res.type,
            resource: {
              id: res.id,
              name: res.name,
            },
          });
        }
      }
    } else if (tool.name === ToolType.WEB_SEARCH) {
      tools.push(ToolType.WEB_SEARCH);
    } else if (tool.name === ToolType.REASONING) {
      tools.push(ToolType.REASONING);
    }
  }

  return { tools, context };
}

/**
 * Extract original tools/settings from a message's attributes with fallback to current state
 */
export function extractOriginalMessageSettings(
  message: MessageDetail | undefined,
  fallbacks: {
    tools: ToolType[];
    context: IResTypeContext[];
    lang: WizardLang;
    enableThinking?: boolean;
  }
): {
  originalTools: ToolType[];
  originalContext: IResTypeContext[];
  originalLang: WizardLang;
  originalEnableThinking: boolean | undefined;
} {
  let originalTools = fallbacks.tools;
  let originalContext = fallbacks.context;
  let originalLang = fallbacks.lang;
  let originalEnableThinking: boolean | undefined = fallbacks.enableThinking;

  if (message?.attrs?.tools) {
    const extracted = extractToolsAndContext(message.attrs.tools);
    originalTools = extracted.tools;
    originalContext = extracted.context;
  }
  if (message?.attrs?.lang) {
    originalLang = message.attrs.lang;
  }
  if (message?.attrs?.enable_thinking !== undefined) {
    originalEnableThinking = message.attrs.enable_thinking;
  }

  return {
    originalTools,
    originalContext,
    originalLang,
    originalEnableThinking,
  };
}

export function prepareBody(
  conversationId: string,
  query: string,
  tools: ToolType[],
  context: IResTypeContext[],
  parent_message_id: string | undefined,
  lang: WizardLang | undefined,
  enable_thinking?: boolean
): ChatRequestBody {
  const body: ChatRequestBody = {
    conversation_id: conversationId,
    query,
    enable_thinking: enable_thinking ?? false,
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
  sharePassword: string | undefined,
  enable_thinking?: boolean
) {
  const chatReq = prepareBody(
    conversationId,
    query,
    tools,
    context,
    parent_message_id,
    lang,
    enable_thinking
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
      toast('Chat Error', {
        description: chatResponse.error,
      });
      console.error(chatResponse);
    } else {
      console.error({ message: 'Unknown response type', chatResponse });
    }
  });
}
