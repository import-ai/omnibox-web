import type { IResTypeContext } from '@/page/chat/chat-input/types';
import { useChatStore } from '@/page/chat/chat-store';

const CHAT_CONTEXT = 'chat_context';

export function getChatContext(): IResTypeContext[] {
  return useChatStore.getState().selectedResources;
}

export function setChatContext(context: IResTypeContext[]) {
  useChatStore.getState().setContext(context);
}

export function removeChatContext() {
  useChatStore.getState().clearContext();
  localStorage.removeItem(CHAT_CONTEXT);
}
