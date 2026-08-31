import { useEffect } from 'react';

import useApp from '@/hooks/useApp';

import {
  CONVERSATION_SHARE_OPEN_EVENT,
  CONVERSATION_SHARE_STATE_EVENT,
  type ConversationShareOpenEvent,
} from './conversationShareEvents';

interface ConversationShareEventController {
  close: () => void;
  isSelecting: boolean;
  open: ConversationShareOpenEventHandler;
}

type ConversationShareOpenEventHandler = (
  targetMessageId?: string,
  initialSelection?: ConversationShareOpenEvent['initialSelection']
) => void;

function useConversationShareCommands(
  conversationId: string,
  controller: ConversationShareEventController
) {
  const app = useApp();

  useEffect(() => {
    const removeOpen = app.on(
      CONVERSATION_SHARE_OPEN_EVENT,
      (event: ConversationShareOpenEvent) => {
        if (event.conversationId !== conversationId) return;
        controller.open(event.targetMessageId, event.initialSelection);
      }
    );
    return removeOpen;
  }, [app, controller.open, conversationId]);
}

/** Bridges the routed conversation share controller with the persistent header. */
export function useConversationShareEvents(
  conversationId: string,
  controller: ConversationShareEventController
) {
  const app = useApp();
  useConversationShareCommands(conversationId, controller);

  useEffect(() => {
    app.fire(CONVERSATION_SHARE_STATE_EVENT, {
      conversationId,
      isSelecting: controller.isSelecting,
    });
  }, [app, controller.isSelecting, conversationId]);

  useEffect(() => {
    if (!controller.isSelecting) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') controller.close();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [controller.close, controller.isSelecting]);
}
