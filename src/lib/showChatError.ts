import { createElement } from 'react';
import { toast } from 'sonner';

import ChatErrorText from '@/components/omnibox/ChatErrorText';
import { type ChatErrorKey, isChatCancellation } from '@/lib/chatErrors';

export function showChatError(error: unknown, fallback?: ChatErrorKey) {
  if (!isChatCancellation(error)) {
    toast.error(createElement(ChatErrorText, { error, fallback }), {
      position: 'bottom-right',
    });
  }
}

// Callers supply product translation keys, never upstream message text.
export function showChatErrorKey(i18nKey: string) {
  toast.error(createElement(ChatErrorText, { i18nKey }), {
    position: 'bottom-right',
  });
}
