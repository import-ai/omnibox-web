import { ToolType } from '@/page/chat/chat-input/types';
import {
  MessageStatus,
  OpenAIMessageRole,
} from '@/page/chat/core/types/chatResponse';
import type { MessageDetail } from '@/page/chat/core/types/conversation';

export interface RestoredTools {
  conversationKey: string;
  signature: string;
  tools: ToolType[];
  ready: boolean;
  hasUserMessage: boolean;
  userMessageId: string | null;
}

export interface ToolRestoreState {
  conversationKey: string | null;
  signature: string | null;
  toolsManuallyChanged: boolean;
  skipNextRestore: boolean;
  suppressedUserMessageId: string | null;
}

export interface ToolRestoreResult {
  nextState: ToolRestoreState;
  toolsToRestore?: ToolType[];
}

export function createToolRestoreState(
  skipNextRestore = false
): ToolRestoreState {
  return {
    conversationKey: null,
    signature: null,
    toolsManuallyChanged: false,
    skipNextRestore,
    suppressedUserMessageId: null,
  };
}

export function markToolsManuallyChanged(
  state: ToolRestoreState
): ToolRestoreState {
  return {
    ...state,
    toolsManuallyChanged: true,
  };
}

export function suppressNextToolRestore(
  state: ToolRestoreState,
  toolsManuallyChanged: boolean
): ToolRestoreState {
  return {
    ...state,
    toolsManuallyChanged,
    skipNextRestore: true,
  };
}

export function getRestoredTools(
  messages: MessageDetail[],
  fallbackConversationKey = 'empty'
): RestoredTools {
  const conversationKey = messages[0]?.id ?? fallbackConversationKey;
  const userMessage = messages
    .slice()
    .reverse()
    .find(message => message.message.role === OpenAIMessageRole.USER);

  if (!userMessage) {
    return {
      conversationKey,
      signature: 'empty',
      tools: [],
      ready: true,
      hasUserMessage: false,
      userMessageId: null,
    };
  }

  const tools = getUserMessageTools(userMessage);

  return {
    conversationKey,
    signature: `${userMessage.id}:${tools.join(',')}`,
    tools,
    ready:
      Boolean(userMessage.attrs) ||
      userMessage.status !== MessageStatus.PENDING,
    hasUserMessage: true,
    userMessageId: userMessage.id,
  };
}

export function resolveToolRestore(
  restoredTools: RestoredTools,
  state: ToolRestoreState,
  suppressInitialRestore: boolean
): ToolRestoreResult {
  if (!restoredTools.ready) {
    return { nextState: state };
  }

  let nextState = syncConversationKey(
    restoredTools,
    state,
    suppressInitialRestore
  );

  if (nextState.toolsManuallyChanged) {
    return { nextState };
  }

  if (nextState.signature === restoredTools.signature) {
    return { nextState };
  }

  nextState = {
    ...nextState,
    signature: restoredTools.signature,
  };

  if (nextState.skipNextRestore && restoredTools.hasUserMessage) {
    return {
      nextState: {
        ...nextState,
        skipNextRestore: false,
        suppressedUserMessageId: restoredTools.userMessageId,
      },
    };
  }

  if (
    restoredTools.userMessageId &&
    nextState.suppressedUserMessageId === restoredTools.userMessageId
  ) {
    return { nextState };
  }

  return {
    nextState,
    toolsToRestore: restoredTools.tools,
  };
}

function getUserMessageTools(userMessage: MessageDetail): ToolType[] {
  const tools: ToolType[] = [];
  if (
    userMessage.attrs?.tools?.some(tool => tool.name === ToolType.WEB_SEARCH)
  ) {
    tools.push(ToolType.WEB_SEARCH);
  }
  if (userMessage.attrs?.enable_thinking) {
    tools.push(ToolType.REASONING);
  }
  return tools;
}

function syncConversationKey(
  restoredTools: RestoredTools,
  state: ToolRestoreState,
  suppressInitialRestore: boolean
): ToolRestoreState {
  if (state.conversationKey === restoredTools.conversationKey) {
    return state;
  }

  return {
    conversationKey: restoredTools.conversationKey,
    signature: null,
    toolsManuallyChanged: false,
    skipNextRestore: suppressInitialRestore,
    suppressedUserMessageId: null,
  };
}
