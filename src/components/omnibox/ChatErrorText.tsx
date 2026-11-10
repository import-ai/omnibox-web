import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { reportChatErrorDisplay } from '@/lib/chatErrorDisplay';
import { chatErrorKey } from '@/lib/chatErrors';

export interface ChatErrorTextProps {
  error?: unknown;
  conversationId?: string;
  messageId?: string;
  requestId?: string;
  parentMessageId?: string;
  channel?: string;
  shareId?: string;
  clientState?: string;
}

export default function ChatErrorText({
  error,
  conversationId,
  messageId,
  requestId,
  parentMessageId,
  channel,
  shareId,
  clientState,
}: ChatErrorTextProps) {
  const { t } = useTranslation();
  const text = t(chatErrorKey(error));
  const errorRef = useRef(error);

  useEffect(() => {
    errorRef.current = error;
  });

  useEffect(() => {
    if (!conversationId && !messageId) return;
    reportChatErrorDisplay(
      text,
      {
        conversationId,
        messageId,
        requestId,
        parentMessageId,
        channel,
        shareId,
        clientState,
        stage: 'display',
      },
      errorRef.current
    );
  }, [
    text,
    conversationId,
    messageId,
    requestId,
    parentMessageId,
    channel,
    shareId,
    clientState,
  ]);

  return <>{text}</>;
}
