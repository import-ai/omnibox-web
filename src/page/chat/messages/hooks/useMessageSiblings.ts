import { useMemo } from 'react';

import { MessageOperator } from '@/page/chat/conversation/message-operator';

/**
 * Custom hook to manage sibling message navigation
 */
export function useMessageSiblings(
  messageId: string,
  messageOperator: MessageOperator
) {
  const siblings = useMemo(() => {
    return messageOperator.getSiblings(messageId);
  }, [messageOperator, messageId]);

  const currentIndex = siblings.indexOf(messageId);
  const hasSiblings = siblings.length > 1;

  const handlePrevious = () => {
    if (currentIndex > 0) {
      messageOperator.activate(siblings[currentIndex - 1]);
    }
  };

  const handleNext = () => {
    if (currentIndex < siblings.length - 1) {
      messageOperator.activate(siblings[currentIndex + 1]);
    }
  };

  return {
    siblings,
    currentIndex,
    hasSiblings,
    handlePrevious,
    handleNext,
  };
}
