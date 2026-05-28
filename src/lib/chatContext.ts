import type { IResTypeContext } from '@/page/chat/chat-input/types';

const CHAT_CONTEXT = 'chat_context';

export function getChatContext(): IResTypeContext[] {
  const cache = localStorage.getItem(CHAT_CONTEXT);
  if (cache) {
    const data = JSON.parse(cache);
    if (Array.isArray(data) && data.length > 0) {
      return data;
    }
  }
  return [];
}

export function setChatContext(context: IResTypeContext[]) {
  localStorage.setItem(CHAT_CONTEXT, JSON.stringify(context));
}

export function removeChatContext() {
  localStorage.removeItem(CHAT_CONTEXT);
}
