/** @jest-environment jsdom */

import { ConversationDetail } from '@/page/chat/core/types/conversation';

import {
  clearCachedConversation,
  getCachedConversation,
  getCachedConversationTitle,
  setCachedConversation,
} from './conversationCache';

describe('conversationCache', () => {
  afterEach(() => {
    clearCachedConversation('conversation-a');
  });

  it('stores conversation detail for warm remounts', () => {
    const conversation: ConversationDetail = {
      id: 'conversation-a',
      title: 'Cached title',
      mapping: {},
    };
    setCachedConversation(conversation);

    expect(getCachedConversation('conversation-a')).toEqual(conversation);
    expect(getCachedConversationTitle('conversation-a')).toBe('Cached title');
  });
});
