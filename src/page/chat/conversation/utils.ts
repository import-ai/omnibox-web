import { FORCE_PRIVATE_SEARCH } from '@/const';
import { ResourceMeta } from '@/interface.ts';
import { http } from '@/lib/request';
import { createStreamTransport } from '@/lib/streamTransport';
import { WizardLang } from '@/lib/wizardLang';
import type {
  ChatImageInput,
  ChatMessageDisplayPart,
} from '@/page/chat/chat-input/types';
import {
  AgentRequestChannel,
  ChatRequestBody,
  ChatTool,
  IResTypeContext,
  PrivateSearch,
  PrivateSearchResource,
  ToolType,
} from '@/page/chat/chat-input/types';
import { MessageOperator } from '@/page/chat/core/messageOperator.ts';
import { messageProcessor } from '@/page/chat/core/messageProcessor.ts';
import {
  ChatDeltaResponse,
  ChatResponse,
  MessageStatus,
  OpenAIMessageRole,
} from '@/page/chat/core/types/chatResponse.ts';
import {
  ConversationDetail,
  MessageDetail,
} from '@/page/chat/core/types/conversation';
import { cacheMessageDisplayParts } from '@/page/chat/messages/messageDisplayPartsCache';

function getPrivateSearchResources(
  context: IResTypeContext[]
): PrivateSearchResource[] {
  return context.map(item => {
    return {
      name: item.resource.name || '',
      id: item.resource.id,
      type: item.type,
      resource_type: item.resource.resource_type,
      attrs: item.resource.attrs,
    };
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
            } as ResourceMeta,
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
export function extractOriginalMessageSettings(message: MessageDetail): {
  originalTools: ToolType[];
  originalContext: IResTypeContext[];
  originalLang: WizardLang;
  originalEnableThinking: boolean | undefined;
} {
  let originalTools: ToolType[] = [];
  let originalContext: IResTypeContext[] = [];
  let originalLang: WizardLang = '简体中文';
  let originalEnableThinking: boolean | undefined = false;

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
  channel: AgentRequestChannel,
  parent_message_id: string | undefined,
  lang: WizardLang | undefined,
  enable_thinking?: boolean,
  currentResourceId?: string
): ChatRequestBody {
  const body: ChatRequestBody = {
    conversation_id: conversationId,
    query,
    enable_thinking: enable_thinking ?? false,
    lang,
    channel,
  };
  if (currentResourceId) {
    body.current_resource_id = currentResourceId;
  }
  if (context.length > 0 && !tools.includes(ToolType.PRIVATE_SEARCH)) {
    tools = [ToolType.PRIVATE_SEARCH, ...tools];
  }
  if (FORCE_PRIVATE_SEARCH && !tools.includes(ToolType.PRIVATE_SEARCH)) {
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

export function beginPendingQuery(
  operator: MessageOperator,
  query: string,
  parentId?: string,
  attrs?: MessageDetail['attrs'],
  id: string = crypto.randomUUID()
): string {
  operator.add({
    response_type: 'bos',
    id,
    role: OpenAIMessageRole.USER,
    parentId: parentId || '',
    created_at: new Date().toISOString(),
    attrs: { ...attrs, pending_query: true, client_request_id: id },
  });
  operator.update({ response_type: 'delta', message: { content: query } }, id);
  return id;
}

export function ask(
  conversationId: string,
  query: string,
  tools: ToolType[],
  context: IResTypeContext[],
  channel: AgentRequestChannel,
  parent_message_id: string | undefined,
  messageOperator: MessageOperator,
  url: string,
  lang: WizardLang | undefined,
  namespaceId: string | undefined,
  shareId: string | undefined,
  sharePassword: string | undefined,
  enable_thinking?: boolean,
  tool_call?: ChatRequestBody['tool_call'],
  displayParts?: ChatMessageDisplayPart[],
  recommendedQuestionId?: string,
  currentResourceId?: string,
  images?: ChatImageInput[],
  pendingQueryId?: string
) {
  const chatReq = prepareBody(
    conversationId,
    query,
    tools,
    context,
    channel,
    parent_message_id,
    lang,
    enable_thinking,
    currentResourceId
  );
  chatReq.namespace_id = namespaceId;
  chatReq.share_id = shareId;
  chatReq.share_password = sharePassword;
  if (tool_call) {
    chatReq.tool_call = tool_call;
  }
  if (recommendedQuestionId) {
    chatReq.recommended_question_id = recommendedQuestionId;
  }
  if (images?.length) {
    chatReq.images = images;
  }
  let pendingDisplayParts = displayParts?.length ? displayParts : undefined;
  const pendingId =
    pendingQueryId || !messageOperator.isUserMessage?.(parent_message_id)
      ? beginPendingQuery(
          messageOperator,
          query,
          parent_message_id,
          {
            tools: chatReq.tools,
            lang,
            enable_thinking,
            composer: displayParts
              ? { display_parts: displayParts }
              : undefined,
            tool_call: tool_call
              ? { ...tool_call, status: 'pending' }
              : undefined,
          },
          pendingQueryId
        )
      : undefined;
  if (pendingId) chatReq.client_request_id = pendingId;
  let acceptedId = pendingId ? undefined : parent_message_id;
  let assistantId: string | undefined;
  let streamError = false;

  const transport = createStreamTransport(
    url,
    chatReq,
    async data => {
      const chatResponse = JSON.parse(data) as ChatResponse;
      if (chatResponse.response_type === 'bos') {
        if (chatResponse.role === OpenAIMessageRole.USER) {
          acceptedId = chatResponse.id;
          // Also reconciles an older backend that does not echo the optional request ID.
          chatResponse.attrs = {
            ...chatResponse.attrs,
            client_request_id: pendingId,
          };
          data = JSON.stringify(chatResponse);
        } else if (chatResponse.role === OpenAIMessageRole.ASSISTANT)
          assistantId = chatResponse.id;
      }
      if (chatResponse.response_type === 'error') {
        streamError = true;
        if (!chatResponse.id && !acceptedId) {
          chatResponse.id = pendingId;
          data = JSON.stringify(chatResponse);
        }
      }
      messageProcessor(messageOperator, data);

      if (
        pendingDisplayParts &&
        chatResponse.response_type === 'bos' &&
        chatResponse.role === OpenAIMessageRole.USER
      ) {
        cacheMessageDisplayParts(chatResponse.id, pendingDisplayParts);
        messageOperator.update(
          {
            response_type: 'delta',
            message: {},
            attrs: {
              composer: {
                display_parts: pendingDisplayParts,
              },
            },
          } as ChatDeltaResponse,
          chatResponse.id
        );
        pendingDisplayParts = undefined;
      }
    },
    streamCancelUrl(url)
  );
  return {
    ...transport,
    start: async () => {
      try {
        await transport.start();
      } catch (error) {
        if (!streamError) {
          let id = pendingId;
          if (acceptedId) {
            id = assistantId || crypto.randomUUID();
            if (!assistantId)
              messageOperator.add({
                response_type: 'bos',
                id,
                role: OpenAIMessageRole.ASSISTANT,
                parentId: acceptedId,
                created_at: new Date().toISOString(),
              });
          }
          messageOperator.error(
            {
              response_type: 'error',
              message: error instanceof Error ? error.message : String(error),
            },
            id
          );
        }
      }
    },
  };
}

export function resumeStream(
  conversationId: string,
  messageOperator: MessageOperator,
  url: string,
  lastEventId?: string
) {
  return createStreamTransport(
    url,
    {
      conversation_id: conversationId,
      last_event_id: lastEventId,
    },
    async data => messageProcessor(messageOperator, data),
    streamCancelUrl(url)
  );
}

function streamCancelUrl(url: string) {
  return url.replace(/\/(?:ask|write|stream\/resume)$/, '/stream/cancel');
}

export function getStreamEventId(conversation: ConversationDetail) {
  return Object.values(conversation.mapping).find(
    message => !isTerminalMessageStatus(message.status)
  )?.attrs?.stream_event_id;
}

export function isTerminalMessageStatus(status?: MessageStatus): boolean {
  return (
    !status ||
    status === MessageStatus.FAILED ||
    status === MessageStatus.STOPPED ||
    status === MessageStatus.SUCCESS
  );
}

export async function stopStream({
  cancel,
  cancelUrl,
  conversationId,
  messageOperator,
  setLoading,
}: {
  cancel?: (() => Promise<void>) | null;
  cancelUrl: string;
  conversationId: string;
  messageOperator: MessageOperator;
  setLoading: (loading: boolean) => void;
}) {
  messageOperator.stop();
  try {
    if (cancel) {
      await cancel();
    } else {
      await http.post(
        cancelUrl,
        { conversation_id: conversationId },
        { mute: true }
      );
    }
  } finally {
    setLoading(false);
  }
}

/**
 * Find the first message whose parent_id does not exist in the messages array
 * This is typically the root message of a conversation
 */
export function findFirstMessageWithMissingParent(
  messages: MessageDetail[]
): MessageDetail | undefined {
  const idSet = new Set(messages.map(msg => msg.id));
  return messages.find(msg => !idSet.has(msg.parent_id));
}
