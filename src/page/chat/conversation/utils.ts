import { v4 as uuidv4 } from 'uuid';

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
import {
  messageProcessor,
  parseChatResponse,
} from '@/page/chat/core/messageProcessor.ts';
import {
  ChatDeltaResponse,
  isTerminalMessageStatus,
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
  currentResourceId?: string,
  edition?: 'basic' | 'pro',
  level?: string
): ChatRequestBody {
  const body: ChatRequestBody = {
    conversation_id: conversationId,
    query,
    lang,
    channel,
  };
  if (edition && level) {
    body.edition = edition;
    body.level = level;
  } else {
    body.enable_thinking = enable_thinking ?? false;
  }
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
      if (!edition) body.enable_thinking = true;
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
  id: string = uuidv4()
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

// What a finished ask left behind, for callers that chain another request
// after it.
export interface AskOutcome {
  // The last assistant or tool message the server created, e.g. the rejected
  // tool result of a decision turn; the next request continues from it. User
  // messages never count: a reply under one would reuse it as the query.
  lastMessageId?: string;
  errorMessage?: string;
  // The server refused the request because the branch waits for a tool
  // decision (reported only when deferPendingInterrupt is set).
  pendingInterrupt?: { messageId: string; count: number };
  // The decisions were refused because another client already decided the
  // interrupt (reported only when reportAlreadyDecided is set).
  alreadyDecided?: boolean;
  failed: boolean;
  // The local pending user message of this request, if one was added.
  requestId?: string;
  // The server ID that local message got once accepted.
  acceptedMessageId?: string;
}

export interface AskOptions {
  // Report a pending decision in the outcome instead of showing it as an
  // error, so the caller can decide it and send the message again.
  deferPendingInterrupt?: boolean;
  // Report an interrupt decided elsewhere in the outcome instead of showing
  // the refusal on the local decision message.
  reportAlreadyDecided?: boolean;
  // Ask the server to continue from the newest message below the parent
  // once any running reply has finished (a new question from the composer).
  followLatest?: boolean;
  // The server put the user message under another parent than requested.
  onReparented?: (parentId: string) => void;
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
  pendingQueryId?: string,
  edition?: 'basic' | 'pro',
  level?: string,
  options: AskOptions = {}
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
    currentResourceId,
    edition,
    level
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
  if (options.followLatest) {
    chatReq.follow_latest = true;
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
            // Kept on the local message so sending it again keeps the strength.
            edition,
            level,
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
  const outcome: AskOutcome = { failed: false, requestId: pendingId };

  const transport = createStreamTransport(
    url,
    chatReq,
    async data => {
      const chatResponse = parseChatResponse(data);
      data = JSON.stringify(chatResponse);
      if (
        chatResponse.response_type === 'error' &&
        chatResponse.code === 'interrupt_already_decided' &&
        options.reportAlreadyDecided &&
        !acceptedId
      ) {
        outcome.failed = true;
        outcome.alreadyDecided = true;
        return;
      }
      if (
        chatResponse.response_type === 'error' &&
        chatResponse.code === 'pending_interrupt' &&
        chatResponse.message_id &&
        options.deferPendingInterrupt &&
        !acceptedId
      ) {
        outcome.failed = true;
        outcome.pendingInterrupt = {
          messageId: chatResponse.message_id,
          count: chatResponse.interrupt_count || 1,
        };
        return;
      }
      if (
        chatResponse.response_type === 'bos' &&
        chatResponse.id &&
        chatResponse.role !== OpenAIMessageRole.USER
      ) {
        outcome.lastMessageId = chatResponse.id;
      }
      if (chatResponse.response_type === 'eos' && !chatResponse.id) {
        chatResponse.id = acceptedId;
        data = JSON.stringify(chatResponse);
      }
      if (chatResponse.response_type === 'bos') {
        if (chatResponse.role === OpenAIMessageRole.USER) {
          acceptedId = chatResponse.id;
          outcome.acceptedMessageId = chatResponse.id;
          if (
            chatResponse.parentId &&
            parent_message_id &&
            chatResponse.parentId !== parent_message_id
          )
            options.onReparented?.(chatResponse.parentId);
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
        outcome.failed = true;
        outcome.errorMessage = chatResponse.message;
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
    outcome,
    start: async () => {
      try {
        await transport.start();
      } catch (error) {
        outcome.failed = true;
        outcome.errorMessage ??=
          error instanceof Error ? error.message : String(error);
        if (!streamError) {
          let id = pendingId;
          if (acceptedId) {
            id = assistantId || uuidv4();
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

export { isTerminalMessageStatus };
