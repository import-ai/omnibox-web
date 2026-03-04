import {
  type ConversationDetail,
  createMessageOperator as sdkCreateMessageOperator,
  type MessageOperator as SDKMessageOperator,
} from '@omnibox/react-common';
import type { Dispatch, SetStateAction } from 'react';

// Re-export the MessageOperator type from SDK
export type MessageOperator = SDKMessageOperator;

/**
 * Create a message operator for managing message state
 * @param conversation - The conversation state
 * @param setConversation - React setState function for conversation
 * @returns MessageOperator instance
 * @deprecated Use createMessageOperator from @omnibox/react-common directly
 */
export function createMessageOperator(
  conversation: ConversationDetail,
  setConversation: Dispatch<SetStateAction<ConversationDetail>>
): MessageOperator {
  // Adapt the web's signature to SDK's signature
  return sdkCreateMessageOperator({ conversation, setConversation });
}
