import { proxy } from 'valtio';

import { MessageDetail } from '@/page/chat/types/conversation';

type MessageType = MessageDetail[];

// 会话列表
export const messageStore = proxy<{ messages: MessageType }>({
  messages: [],
});

export const addMessage = (message: MessageType) => {
  messageStore.messages = message;
};
